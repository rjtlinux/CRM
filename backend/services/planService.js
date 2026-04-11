const masterPool = require('../config/masterDatabase');

/**
 * Plan Service - Handles subscription plan logic and usage tracking
 * 
 * This service connects to the master database (crm_master) to:
 * - Check tenant plan limits
 * - Track resource usage
 * - Check feature availability
 * - Manage usage resets
 */
class PlanService {
  /**
   * Get tenant plan configuration from master DB
   * @param {string} tenantSlug - Tenant identifier
   * @returns {Promise<Object>} Tenant plan details
   */
  async getTenantPlan(tenantSlug) {
    try {
      const result = await masterPool.query(`
        SELECT 
          t.id,
          t.slug,
          t.name,
          t.plan,
          t.status,
          t.plan_limits,
          t.current_usage,
          t.billing_cycle_start,
          t.next_billing_date,
          pc.display_name,
          pc.price_inr,
          pc.features
        FROM tenants t
        LEFT JOIN plan_configurations pc ON t.plan = pc.plan_name
        WHERE t.slug = $1
      `, [tenantSlug]);
      
      if (result.rows.length === 0) {
        throw new Error(`Tenant not found: ${tenantSlug}`);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching tenant plan:', error);
      throw error;
    }
  }

  /**
   * Check if tenant has reached a specific limit
   * @param {string} tenantSlug - Tenant identifier
   * @param {string} limitType - Type of limit to check (e.g., 'max_customers')
   * @returns {Promise<Object>} Limit check result
   */
  async checkLimit(tenantSlug, limitType) {
    try {
      const tenant = await this.getTenantPlan(tenantSlug);
      
      if (!tenant.plan_limits) {
        console.warn(`No plan limits found for tenant: ${tenantSlug}`);
        return { allowed: true, remaining: -1, unlimited: true };
      }

      const limit = tenant.plan_limits[limitType];
      
      // -1 means unlimited
      if (limit === -1 || limit === null || limit === undefined) {
        return { allowed: true, remaining: -1, unlimited: true };
      }
      
      // Map limit type to usage key
      const usageKey = this.getLimitUsageKey(limitType);
      const current = (tenant.current_usage && tenant.current_usage[usageKey]) || 0;
      
      const remaining = limit - current;
      return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining),
        limit,
        current,
        percentUsed: limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0,
        unlimited: false
      };
    } catch (error) {
      console.error('Error checking limit:', error);
      // Fail open - allow operation if check fails
      return { allowed: true, remaining: -1, error: true };
    }
  }

  /**
   * Map limit type to usage tracking key
   * @param {string} limitType - Limit type (e.g., 'max_customers')
   * @returns {string} Usage key (e.g., 'customers_count')
   */
  getLimitUsageKey(limitType) {
    const mapping = {
      'max_customers': 'customers_count',
      'max_users': 'users_count',
      'max_transactions_monthly': 'transactions_this_month',
      'max_opportunities': 'opportunities_count',
      'max_proposals': 'proposals_count',
      'max_ai_commands_monthly': 'ai_commands_this_month'
    };
    
    return mapping[limitType] || limitType.replace('max_', '') + '_count';
  }

  /**
   * Check if tenant has access to a specific feature
   * @param {string} tenantSlug - Tenant identifier
   * @param {string} featureName - Feature to check (e.g., 'whatsapp')
   * @returns {Promise<boolean>} True if feature is available
   */
  async checkFeature(tenantSlug, featureName) {
    try {
      const tenant = await this.getTenantPlan(tenantSlug);
      
      if (!tenant.features) {
        console.warn(`No features found for tenant: ${tenantSlug}`);
        return false;
      }
      
      return tenant.features[featureName] === true;
    } catch (error) {
      console.error('Error checking feature:', error);
      // Fail closed - deny access if check fails
      return false;
    }
  }

  /**
   * Increment usage counter after successful action
   * @param {string} tenantSlug - Tenant identifier
   * @param {string} usageType - Type of usage (e.g., 'customers_count')
   * @param {number} amount - Amount to increment (default: 1)
   */
  async incrementUsage(tenantSlug, usageType, amount = 1) {
    try {
      await masterPool.query(`
        UPDATE tenants
        SET current_usage = jsonb_set(
          current_usage,
          '{${usageType}}',
          to_jsonb(COALESCE((current_usage->>'${usageType}')::int, 0) + $1)
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE slug = $2
      `, [amount, tenantSlug]);
      
      console.log(`✅ Incremented ${usageType} by ${amount} for tenant: ${tenantSlug}`);
    } catch (error) {
      console.error('Error incrementing usage:', error);
      // Don't throw - usage tracking is non-critical
    }
  }

  /**
   * Decrement usage counter after deletion
   * @param {string} tenantSlug - Tenant identifier
   * @param {string} usageType - Type of usage (e.g., 'customers_count')
   * @param {number} amount - Amount to decrement (default: 1)
   */
  async decrementUsage(tenantSlug, usageType, amount = 1) {
    try {
      await masterPool.query(`
        UPDATE tenants
        SET current_usage = jsonb_set(
          current_usage,
          '{${usageType}}',
          to_jsonb(GREATEST(0, COALESCE((current_usage->>'${usageType}')::int, 0) - $1))
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE slug = $2
      `, [amount, tenantSlug]);
      
      console.log(`✅ Decremented ${usageType} by ${amount} for tenant: ${tenantSlug}`);
    } catch (error) {
      console.error('Error decrementing usage:', error);
      // Don't throw - usage tracking is non-critical
    }
  }

  /**
   * Reset monthly counters (called by cron job)
   * @param {string} tenantSlug - Tenant identifier (optional, resets all if not provided)
   */
  async resetMonthlyUsage(tenantSlug = null) {
    try {
      const query = tenantSlug 
        ? 'WHERE slug = $1'
        : '';
      
      const params = tenantSlug ? [tenantSlug] : [];
      
      const result = await masterPool.query(`
        UPDATE tenants
        SET current_usage = jsonb_set(
          jsonb_set(
            current_usage,
            '{transactions_this_month}',
            '0'
          ),
          '{ai_commands_this_month}',
          '0'
        ),
        current_usage = jsonb_set(
          current_usage,
          '{last_reset_date}',
          to_jsonb(CURRENT_DATE::text)
        ),
        updated_at = CURRENT_TIMESTAMP
        ${query}
      `, params);
      
      console.log(`✅ Reset monthly usage for ${result.rowCount} tenant(s)`);
      return result.rowCount;
    } catch (error) {
      console.error('Error resetting monthly usage:', error);
      throw error;
    }
  }

  /**
   * Get usage summary for dashboard
   * @param {string} tenantSlug - Tenant identifier
   * @returns {Promise<Object>} Usage summary
   */
  async getUsageSummary(tenantSlug) {
    try {
      const tenant = await this.getTenantPlan(tenantSlug);
      
      return {
        plan: {
          name: tenant.plan,
          displayName: tenant.display_name,
          price: tenant.price_inr,
          status: tenant.status
        },
        limits: tenant.plan_limits || {},
        usage: tenant.current_usage || {},
        features: tenant.features || {},
        warnings: this.getUsageWarnings(tenant),
        billingCycle: {
          start: tenant.billing_cycle_start,
          next: tenant.next_billing_date
        }
      };
    } catch (error) {
      console.error('Error getting usage summary:', error);
      throw error;
    }
  }

  /**
   * Get warnings for resources approaching limits
   * @param {Object} tenant - Tenant object with limits and usage
   * @returns {Array} Array of warning objects
   */
  getUsageWarnings(tenant) {
    const warnings = [];
    
    if (!tenant.plan_limits || !tenant.current_usage) {
      return warnings;
    }
    
    const limits = tenant.plan_limits;
    const usage = tenant.current_usage;
    
    Object.keys(limits).forEach(key => {
      const limit = limits[key];
      
      // Skip unlimited resources
      if (limit === -1 || limit === null || limit === undefined) {
        return;
      }
      
      const usageKey = this.getLimitUsageKey(key);
      const current = usage[usageKey] || 0;
      const percent = limit > 0 ? (current / limit) * 100 : 0;
      
      // Warn at 75%, 90%, and 100%
      if (percent >= 75) {
        warnings.push({
          type: key,
          label: this.getLimitLabel(key),
          current,
          limit,
          percent: Math.round(percent),
          severity: percent >= 100 ? 'critical' : percent >= 90 ? 'high' : 'warning'
        });
      }
    });
    
    return warnings;
  }

  /**
   * Get human-readable label for limit type
   * @param {string} limitType - Limit type
   * @returns {string} Human-readable label
   */
  getLimitLabel(limitType) {
    const labels = {
      'max_customers': 'Customers',
      'max_users': 'Users',
      'max_transactions_monthly': 'Transactions (This Month)',
      'max_opportunities': 'Opportunities',
      'max_proposals': 'Proposals',
      'max_ai_commands_monthly': 'AI Commands (This Month)'
    };
    
    return labels[limitType] || limitType.replace('max_', '').replace('_', ' ');
  }

  /**
   * Suggest upgrade path based on current plan
   * @param {string} currentPlan - Current plan name
   * @returns {Object|null} Upgrade suggestion
   */
  getUpgradePath(currentPlan) {
    const upgradePaths = {
      'starter': {
        to: 'professional',
        price: 2499,
        benefits: [
          'Unlimited customers',
          '5 user accounts',
          'WhatsApp integration',
          'AI voice assistant',
          'Advanced analytics',
          'Priority support'
        ]
      },
      'professional': {
        to: 'enterprise',
        price: 'Custom',
        benefits: [
          'Unlimited users',
          'Unlimited AI commands',
          'API access',
          'Custom integrations',
          'Dedicated account manager',
          '24/7 phone support'
        ]
      }
    };
    
    return upgradePaths[currentPlan] || null;
  }

  /**
   * Initialize usage counters for a new tenant
   * @param {string} tenantSlug - Tenant identifier
   */
  async initializeUsageCounters(tenantSlug) {
    try {
      await masterPool.query(`
        UPDATE tenants
        SET current_usage = '{
          "customers_count": 0,
          "users_count": 1,
          "transactions_this_month": 0,
          "opportunities_count": 0,
          "proposals_count": 0,
          "ai_commands_this_month": 0,
          "last_reset_date": null
        }'::jsonb,
        billing_cycle_start = CURRENT_DATE,
        next_billing_date = CURRENT_DATE + INTERVAL '1 month'
        WHERE slug = $1
      `, [tenantSlug]);
      
      console.log(`✅ Initialized usage counters for tenant: ${tenantSlug}`);
    } catch (error) {
      console.error('Error initializing usage counters:', error);
      throw error;
    }
  }
}

module.exports = new PlanService();
