# Plan-Based Access Control Implementation Plan

## 📋 Overview

This document outlines the complete implementation plan for restricting tenant access based on their subscription plan (Starter, Professional, Enterprise) in the Buzeye CRM system.

**Current State:**
- ✅ Multi-tenant architecture with separate deployments per tenant
- ✅ Master tenants table with `plan` field already exists
- ✅ Role-based authorization (admin, user, sales)
- ❌ No plan enforcement or usage tracking
- ❌ No upgrade/downgrade flows
- ❌ No plan limits displayed in UI

**Goal:**
Implement hard limits and feature restrictions based on each tenant's subscription plan, with graceful handling and upgrade prompts.

---

## 🎯 Plan Definitions

### Starter Plan (₹999/month)
**Target:** Small shops, new businesses, solo entrepreneurs

**Limits:**
- Maximum 500 customers
- Maximum 2 user accounts (including admin)
- Maximum 1,000 transactions/month (sales + costs)
- Maximum 50 opportunities
- Maximum 20 proposals
- Maximum 100 AI commands/month

**Features:**
- ✅ Basic analytics
- ✅ GST invoicing
- ✅ Udhar Khata
- ✅ Mobile access
- ✅ Hindi/English support
- ✅ Email support (48 hour response)
- ❌ No WhatsApp integration
- ❌ No AI voice assistant
- ❌ No advanced analytics
- ❌ No custom reports
- ❌ No API access

---

### Professional Plan (₹2,499/month)
**Target:** Growing businesses, small teams, wholesalers

**Limits:**
- Unlimited customers
- Maximum 5 user accounts
- Unlimited transactions
- Maximum 200 opportunities
- Maximum 100 proposals
- Maximum 1,000 AI commands/month

**Features:**
- ✅ All Starter features
- ✅ WhatsApp integration
- ✅ AI voice assistant (limited)
- ✅ Advanced analytics with AI
- ✅ Custom report builder
- ✅ Multi-user collaboration
- ✅ Priority support (24 hour response)
- ✅ Bulk actions (import/export)
- ❌ No API access
- ❌ No custom integrations
- ❌ No dedicated account manager

---

### Enterprise Plan (Custom pricing)
**Target:** Large businesses, multi-branch, distributors

**Limits:**
- Unlimited everything
- Unlimited user accounts
- Unlimited AI commands
- Unlimited storage

**Features:**
- ✅ All Professional features
- ✅ API access with custom rate limits
- ✅ Custom integrations
- ✅ On-premise deployment option
- ✅ Dedicated account manager
- ✅ 24/7 phone support
- ✅ Training & onboarding
- ✅ Custom feature development
- ✅ SLA guarantees (99.9% uptime)
- ✅ Multi-branch support
- ✅ White-label option

---

## 🗄️ Database Schema Changes

### 1. Tenant Schema Updates

```sql
-- Add usage tracking columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_limits JSONB DEFAULT '{
  "max_customers": 500,
  "max_users": 2,
  "max_transactions_monthly": 1000,
  "max_opportunities": 50,
  "max_proposals": 20,
  "max_ai_commands_monthly": 100,
  "features": {
    "whatsapp": false,
    "ai_voice": false,
    "advanced_analytics": false,
    "custom_reports": false,
    "api_access": false
  }
}'::jsonb;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_usage JSONB DEFAULT '{
  "customers_count": 0,
  "users_count": 0,
  "transactions_this_month": 0,
  "opportunities_count": 0,
  "proposals_count": 0,
  "ai_commands_this_month": 0,
  "last_reset_date": null
}'::jsonb;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_cycle_start DATE DEFAULT CURRENT_DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS next_billing_date DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_downgrade_to VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_change_effective_date DATE;

-- Create plan configurations table
CREATE TABLE IF NOT EXISTS plan_configurations (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    price_inr INTEGER NOT NULL,
    price_period VARCHAR(20) DEFAULT 'month',
    limits JSONB NOT NULL,
    features JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default plan configurations
INSERT INTO plan_configurations (plan_name, display_name, price_inr, limits, features, sort_order) VALUES
('starter', 'Starter', 999, '{
  "max_customers": 500,
  "max_users": 2,
  "max_transactions_monthly": 1000,
  "max_opportunities": 50,
  "max_proposals": 20,
  "max_ai_commands_monthly": 100
}'::jsonb, '{
  "whatsapp": false,
  "ai_voice": false,
  "advanced_analytics": false,
  "custom_reports": false,
  "api_access": false,
  "priority_support": false
}'::jsonb, 1),

('professional', 'Professional', 2499, '{
  "max_customers": -1,
  "max_users": 5,
  "max_transactions_monthly": -1,
  "max_opportunities": 200,
  "max_proposals": 100,
  "max_ai_commands_monthly": 1000
}'::jsonb, '{
  "whatsapp": true,
  "ai_voice": true,
  "advanced_analytics": true,
  "custom_reports": true,
  "api_access": false,
  "priority_support": true
}'::jsonb, 2),

('enterprise', 'Enterprise', 0, '{
  "max_customers": -1,
  "max_users": -1,
  "max_transactions_monthly": -1,
  "max_opportunities": -1,
  "max_proposals": -1,
  "max_ai_commands_monthly": -1
}'::jsonb, '{
  "whatsapp": true,
  "ai_voice": true,
  "advanced_analytics": true,
  "custom_reports": true,
  "api_access": true,
  "priority_support": true,
  "dedicated_manager": true,
  "custom_integrations": true,
  "onpremise": true,
  "sla": true
}'::jsonb, 3)
ON CONFLICT (plan_name) DO NOTHING;

COMMENT ON TABLE plan_configurations IS 'Master plan definitions with limits and features';
COMMENT ON COLUMN plan_configurations.limits IS 'JSONB: -1 means unlimited';
```

### 2. Per-Tenant Database Schema

```sql
-- Add usage tracking trigger function
CREATE OR REPLACE FUNCTION update_tenant_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be called by backend after each action
    -- Tenant usage is tracked in master DB, not per-tenant DB
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add created_by tracking to all tables (if not exists)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE costs ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Add soft delete support for plan downgrades
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
```

---

## 🔧 Backend Implementation

### Phase 1: Core Infrastructure

#### 1.1 Plan Service (`backend/services/planService.js`)

```javascript
const pool = require('../config/database');
const masterPool = require('../config/masterDatabase');

class PlanService {
  /**
   * Get tenant plan configuration from master DB
   */
  async getTenantPlan(tenantSlug) {
    const result = await masterPool.query(`
      SELECT t.*, pc.limits, pc.features, pc.display_name, pc.price_inr
      FROM tenants t
      LEFT JOIN plan_configurations pc ON t.plan = pc.plan_name
      WHERE t.slug = $1 AND t.status = 'active'
    `, [tenantSlug]);
    
    if (result.rows.length === 0) {
      throw new Error('Tenant not found or inactive');
    }
    
    return result.rows[0];
  }

  /**
   * Check if tenant has reached a specific limit
   */
  async checkLimit(tenantSlug, limitType) {
    const tenant = await this.getTenantPlan(tenantSlug);
    const limit = tenant.limits[limitType];
    const current = tenant.current_usage[limitType];
    
    // -1 means unlimited
    if (limit === -1) return { allowed: true, remaining: -1 };
    
    const remaining = limit - current;
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      limit,
      current,
      percentUsed: Math.min(100, (current / limit) * 100)
    };
  }

  /**
   * Check if tenant has access to a specific feature
   */
  async checkFeature(tenantSlug, featureName) {
    const tenant = await this.getTenantPlan(tenantSlug);
    return tenant.features[featureName] === true;
  }

  /**
   * Increment usage counter (call after successful action)
   */
  async incrementUsage(tenantSlug, usageType, amount = 1) {
    await masterPool.query(`
      UPDATE tenants
      SET current_usage = jsonb_set(
        current_usage,
        '{${usageType}}',
        to_jsonb((current_usage->>'${usageType}')::int + $1)
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE slug = $2
    `, [amount, tenantSlug]);
  }

  /**
   * Decrement usage counter (call after deletion)
   */
  async decrementUsage(tenantSlug, usageType, amount = 1) {
    await masterPool.query(`
      UPDATE tenants
      SET current_usage = jsonb_set(
        current_usage,
        '{${usageType}}',
        to_jsonb(GREATEST(0, (current_usage->>'${usageType}')::int - $1))
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE slug = $2
    `, [amount, tenantSlug]);
  }

  /**
   * Reset monthly counters (run via cron job)
   */
  async resetMonthlyUsage(tenantSlug) {
    await masterPool.query(`
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
      )
      WHERE slug = $1
    `, [tenantSlug]);
  }

  /**
   * Get usage summary for dashboard
   */
  async getUsageSummary(tenantSlug) {
    const tenant = await this.getTenantPlan(tenantSlug);
    
    return {
      plan: {
        name: tenant.plan,
        displayName: tenant.display_name,
        price: tenant.price_inr
      },
      limits: tenant.limits,
      usage: tenant.current_usage,
      features: tenant.features,
      warnings: this.getUsageWarnings(tenant)
    };
  }

  /**
   * Get warnings for resources approaching limits
   */
  getUsageWarnings(tenant) {
    const warnings = [];
    const limits = tenant.limits;
    const usage = tenant.current_usage;
    
    Object.keys(limits).forEach(key => {
      if (limits[key] === -1) return; // Unlimited
      
      const usageKey = key.replace('max_', '') + (key.includes('monthly') ? '' : '_count');
      const current = usage[usageKey] || 0;
      const limit = limits[key];
      const percent = (current / limit) * 100;
      
      if (percent >= 90) {
        warnings.push({
          type: key,
          current,
          limit,
          percent: Math.round(percent),
          severity: percent >= 100 ? 'critical' : 'warning'
        });
      }
    });
    
    return warnings;
  }
}

module.exports = new PlanService();
```

#### 1.2 Plan Enforcement Middleware (`backend/middleware/planEnforcement.js`)

```javascript
const planService = require('../services/planService');

/**
 * Check if tenant can perform action based on plan limits
 * Usage: router.post('/customers', checkPlanLimit('max_customers'), ...)
 */
const checkPlanLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      const tenantSlug = req.user.tenantSlug || extractTenantFromRequest(req);
      
      const limitCheck = await planService.checkLimit(tenantSlug, limitType);
      
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: 'Plan limit reached',
          message: `You have reached your plan limit for ${limitType.replace('max_', '').replace('_', ' ')}`,
          limit: limitCheck.limit,
          current: limitCheck.current,
          upgradeRequired: true,
          upgradePath: getUpgradePath(req.user.plan)
        });
      }
      
      // Attach limit info to request for logging
      req.planLimit = limitCheck;
      next();
    } catch (error) {
      console.error('Plan limit check error:', error);
      next(error);
    }
  };
};

/**
 * Check if tenant has access to specific feature
 * Usage: router.post('/whatsapp/send', checkPlanFeature('whatsapp'), ...)
 */
const checkPlanFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const tenantSlug = req.user.tenantSlug || extractTenantFromRequest(req);
      
      const hasFeature = await planService.checkFeature(tenantSlug, featureName);
      
      if (!hasFeature) {
        return res.status(403).json({
          error: 'Feature not available',
          message: `${featureName} is not available in your current plan`,
          feature: featureName,
          upgradeRequired: true,
          upgradePath: getUpgradePath(req.user.plan)
        });
      }
      
      next();
    } catch (error) {
      console.error('Plan feature check error:', error);
      next(error);
    }
  };
};

/**
 * Suggest upgrade path based on current plan
 */
function getUpgradePath(currentPlan) {
  const upgradePaths = {
    'starter': {
      to: 'professional',
      benefits: ['Unlimited customers', '5 users', 'WhatsApp integration', 'AI assistant']
    },
    'professional': {
      to: 'enterprise',
      benefits: ['Unlimited users', 'API access', 'Dedicated support', 'Custom features']
    }
  };
  
  return upgradePaths[currentPlan] || null;
}

/**
 * Extract tenant slug from request (subdomain or JWT)
 */
function extractTenantFromRequest(req) {
  // Option 1: From JWT (if we add tenantSlug to token)
  if (req.user && req.user.tenantSlug) {
    return req.user.tenantSlug;
  }
  
  // Option 2: From subdomain
  const host = req.get('host');
  const subdomain = host.split('.')[0];
  
  // Skip for localhost and admin
  if (subdomain === 'localhost' || subdomain === 'admin' || subdomain.includes(':')) {
    return 'admin'; // Default tenant for dev
  }
  
  return subdomain;
}

module.exports = {
  checkPlanLimit,
  checkPlanFeature
};
```

#### 1.3 Usage Tracking Middleware (`backend/middleware/usageTracking.js`)

```javascript
const planService = require('../services/planService');

/**
 * Track successful creates/updates/deletes
 * Should be called AFTER successful DB operation
 */
const trackUsage = (usageType, operation = 'increment') => {
  return async (req, res, next) => {
    try {
      const tenantSlug = req.user.tenantSlug || extractTenantFromRequest(req);
      
      if (operation === 'increment') {
        await planService.incrementUsage(tenantSlug, usageType);
      } else if (operation === 'decrement') {
        await planService.decrementUsage(tenantSlug, usageType);
      }
      
      next();
    } catch (error) {
      // Log but don't fail the request
      console.error('Usage tracking error:', error);
      next();
    }
  };
};

function extractTenantFromRequest(req) {
  const host = req.get('host');
  const subdomain = host.split('.')[0];
  if (subdomain === 'localhost' || subdomain === 'admin' || subdomain.includes(':')) {
    return 'admin';
  }
  return subdomain;
}

module.exports = { trackUsage };
```

---

### Phase 2: Controller Updates

#### 2.1 Customer Controller Updates

```javascript
// backend/controllers/customerController.js

const { checkPlanLimit } = require('../middleware/planEnforcement');
const { trackUsage } = require('../middleware/usageTracking');

// Update routes:
router.post('/', 
  authenticateToken, 
  sanitize,
  checkPlanLimit('max_customers'), // CHECK BEFORE CREATE
  [validateCustomer()],
  validate,
  async (req, res) => {
    try {
      // ... existing create logic ...
      
      // Track usage after successful creation
      const tenantSlug = extractTenantFromRequest(req);
      await planService.incrementUsage(tenantSlug, 'customers_count');
      
      res.status(201).json({ success: true, customer: result.rows[0] });
    } catch (error) {
      // ... error handling ...
    }
  }
);

router.delete('/:id',
  authenticateToken,
  async (req, res) => {
    try {
      // ... existing delete logic ...
      
      // Decrement usage after successful deletion
      const tenantSlug = extractTenantFromRequest(req);
      await planService.decrementUsage(tenantSlug, 'customers_count');
      
      res.json({ success: true });
    } catch (error) {
      // ... error handling ...
    }
  }
);
```

#### 2.2 Similar Updates for Other Controllers

- **salesController.js**: Check `max_transactions_monthly` before create
- **opportunityController.js**: Check `max_opportunities` before create
- **proposalController.js**: Check `max_proposals` before create
- **authController.js**: Check `max_users` before user creation
- **aiController.js**: Check `max_ai_commands_monthly` and `ai_voice` feature

---

### Phase 3: Plan Management API

#### 3.1 Plan Management Controller (`backend/controllers/planController.js`)

```javascript
const planService = require('../services/planService');
const masterPool = require('../config/masterDatabase');

/**
 * Get current plan and usage for logged-in tenant
 */
const getCurrentPlan = async (req, res) => {
  try {
    const tenantSlug = extractTenantFromRequest(req);
    const summary = await planService.getUsageSummary(tenantSlug);
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Failed to fetch plan information' });
  }
};

/**
 * Get all available plans
 */
const getAvailablePlans = async (req, res) => {
  try {
    const result = await masterPool.query(`
      SELECT plan_name, display_name, price_inr, price_period, limits, features
      FROM plan_configurations
      WHERE is_active = true
      ORDER BY sort_order ASC
    `);
    
    res.json({ success: true, plans: result.rows });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch available plans' });
  }
};

/**
 * Request plan upgrade (creates ticket for admin approval)
 */
const requestUpgrade = async (req, res) => {
  try {
    const tenantSlug = extractTenantFromRequest(req);
    const { targetPlan } = req.body;
    
    // Validate target plan exists
    const planCheck = await masterPool.query(
      'SELECT 1 FROM plan_configurations WHERE plan_name = $1 AND is_active = true',
      [targetPlan]
    );
    
    if (planCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    // Create upgrade request (to be reviewed by super admin)
    await masterPool.query(`
      INSERT INTO plan_change_requests (tenant_slug, current_plan, requested_plan, requested_by, status)
      SELECT $1, plan, $2, $3, 'pending'
      FROM tenants WHERE slug = $1
    `, [tenantSlug, targetPlan, req.user.email]);
    
    res.json({ 
      success: true, 
      message: 'Upgrade request submitted. Our team will contact you shortly.' 
    });
  } catch (error) {
    console.error('Error requesting upgrade:', error);
    res.status(500).json({ error: 'Failed to submit upgrade request' });
  }
};

module.exports = {
  getCurrentPlan,
  getAvailablePlans,
  requestUpgrade
};
```

---

## 🎨 Frontend Implementation

### Phase 4: UI Components

#### 4.1 Plan Usage Dashboard Component

```jsx
// frontend/src/components/PlanUsageWidget.jsx

import { useEffect, useState } from 'react';
import api from '../services/api';

const PlanUsageWidget = () => {
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlanData();
  }, []);

  const fetchPlanData = async () => {
    try {
      const response = await api.get('/plan/current');
      setPlanData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!planData) return null;

  const { plan, limits, usage, warnings } = planData;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Your Plan: {plan.displayName}</h3>
        {plan.name !== 'enterprise' && (
          <button 
            onClick={() => window.location.href = '/upgrade'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Upgrade
          </button>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 font-semibold">⚠️ Usage Alerts</p>
          {warnings.map((warning, idx) => (
            <p key={idx} className="text-sm text-yellow-700">
              {warning.type}: {warning.current}/{warning.limit} ({warning.percent}% used)
            </p>
          ))}
        </div>
      )}

      {/* Usage Bars */}
      <div className="space-y-4">
        <UsageBar 
          label="Customers" 
          current={usage.customers_count} 
          limit={limits.max_customers} 
        />
        <UsageBar 
          label="Users" 
          current={usage.users_count} 
          limit={limits.max_users} 
        />
        <UsageBar 
          label="Transactions (This Month)" 
          current={usage.transactions_this_month} 
          limit={limits.max_transactions_monthly} 
        />
        {limits.max_ai_commands_monthly !== -1 && (
          <UsageBar 
            label="AI Commands (This Month)" 
            current={usage.ai_commands_this_month} 
            limit={limits.max_ai_commands_monthly} 
          />
        )}
      </div>
    </div>
  );
};

const UsageBar = ({ label, current, limit }) => {
  if (limit === -1) {
    return (
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span className="text-green-600">Unlimited ✓</span>
        </div>
      </div>
    );
  }

  const percent = Math.min(100, (current / limit) * 100);
  const color = percent >= 90 ? 'bg-red-500' : percent >= 75 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{current} / {limit}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default PlanUsageWidget;
```

#### 4.2 Plan Limit Modal Component

```jsx
// frontend/src/components/PlanLimitModal.jsx

import { useState } from 'react';
import api from '../services/api';

const PlanLimitModal = ({ show, onClose, limitType, currentPlan }) => {
  const [loading, setLoading] = useState(false);

  const handleUpgradeRequest = async () => {
    setLoading(true);
    try {
      const targetPlan = currentPlan === 'starter' ? 'professional' : 'enterprise';
      await api.post('/plan/request-upgrade', { targetPlan });
      alert('Upgrade request submitted! We will contact you shortly.');
      onClose();
    } catch (error) {
      alert('Failed to submit upgrade request');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Plan Limit Reached</h2>
        <p className="text-gray-600 mb-6">
          You've reached your {limitType} limit on the {currentPlan} plan.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Upgrade Benefits:</h3>
          <ul className="list-disc list-inside text-sm text-blue-800">
            {currentPlan === 'starter' ? (
              <>
                <li>Unlimited customers</li>
                <li>5 user accounts</li>
                <li>WhatsApp integration</li>
                <li>AI voice assistant</li>
                <li>Priority support</li>
              </>
            ) : (
              <>
                <li>Unlimited users</li>
                <li>API access</li>
                <li>Custom integrations</li>
                <li>Dedicated account manager</li>
                <li>24/7 support</li>
              </>
            )}
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpgradeRequest}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Request Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanLimitModal;
```

#### 4.3 Dashboard Integration

```jsx
// frontend/src/pages/Dashboard.jsx

import PlanUsageWidget from '../components/PlanUsageWidget';

// Add to dashboard:
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
  {/* Existing stats cards */}
  <div className="lg:col-span-1">
    <PlanUsageWidget />
  </div>
</div>
```

---

## 🛠️ Admin Panel Enhancements

### Phase 5: Super Admin Features

#### 5.1 Tenant Plan Management

```jsx
// Admin panel to view and change tenant plans
// Location: frontend/src/pages/AdminTenants.jsx (new page)

const AdminTenants = () => {
  const [tenants, setTenants] = useState([]);
  
  const changeTenantPlan = async (tenantId, newPlan) => {
    try {
      await api.put(`/admin/tenants/${tenantId}/plan`, { plan: newPlan });
      // Refresh list
      fetchTenants();
    } catch (error) {
      alert('Failed to change plan');
    }
  };

  return (
    <div>
      <h1>Tenant Management</h1>
      <table>
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Current Plan</th>
            <th>Usage</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map(tenant => (
            <tr key={tenant.id}>
              <td>{tenant.name}</td>
              <td>{tenant.plan}</td>
              <td>{/* Usage summary */}</td>
              <td>{tenant.status}</td>
              <td>
                <select 
                  value={tenant.plan}
                  onChange={(e) => changeTenantPlan(tenant.id, e.target.value)}
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 📅 Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Set up plan infrastructure without enforcement

- [ ] Create master database schema (plan_configurations, tenant updates)
- [ ] Create planService.js with core functions
- [ ] Add plan data to JWT token on login
- [ ] Create GET /api/plan/current endpoint
- [ ] Build PlanUsageWidget component
- [ ] Test with dummy data

### Phase 2: Hard Limits (Week 3-4)
**Goal:** Enforce limits on critical resources

- [ ] Implement checkPlanLimit middleware
- [ ] Add limit checks to customer creation
- [ ] Add limit checks to user creation
- [ ] Add limit checks to opportunity/proposal creation
- [ ] Implement usage tracking (increment/decrement)
- [ ] Build PlanLimitModal component
- [ ] Test limit enforcement end-to-end

### Phase 3: Feature Restrictions (Week 5-6)
**Goal:** Restrict features by plan

- [ ] Implement checkPlanFeature middleware
- [ ] Add WhatsApp feature check
- [ ] Add AI voice feature check
- [ ] Add custom reports feature check
- [ ] Add API access feature check
- [ ] Hide/disable UI elements for unavailable features
- [ ] Test feature restrictions

### Phase 4: Usage Tracking & Reset (Week 7)
**Goal:** Track monthly usage and reset

- [ ] Implement monthly usage counters
- [ ] Create cron job to reset monthly counters
- [ ] Add usage reset on billing cycle
- [ ] Test monthly reset logic

### Phase 5: Upgrade Flow (Week 8)
**Goal:** Allow tenants to request upgrades

- [ ] Build upgrade request page
- [ ] Create plan_change_requests table
- [ ] Implement requestUpgrade API
- [ ] Build admin approval workflow
- [ ] Add email notifications
- [ ] Test upgrade flow end-to-end

### Phase 6: Admin Panel (Week 9-10)
**Goal:** Super admin can manage tenant plans

- [ ] Build AdminTenants page
- [ ] Add tenant plan change API
- [ ] Add usage analytics dashboard
- [ ] Add tenant suspension feature
- [ ] Test admin operations

---

## 🔄 Monthly Reset Cron Job

```javascript
// backend/cron/resetMonthlyUsage.js

const cron = require('node-cron');
const planService = require('../services/planService');
const masterPool = require('../config/masterDatabase');

/**
 * Run on 1st of every month at 00:01
 */
cron.schedule('1 0 1 * *', async () => {
  console.log('Starting monthly usage reset...');
  
  try {
    // Get all active tenants
    const result = await masterPool.query(`
      SELECT slug FROM tenants WHERE status = 'active'
    `);
    
    for (const tenant of result.rows) {
      await planService.resetMonthlyUsage(tenant.slug);
      console.log(`Reset usage for tenant: ${tenant.slug}`);
    }
    
    console.log('Monthly usage reset completed');
  } catch (error) {
    console.error('Error resetting monthly usage:', error);
  }
});

// Also reset based on billing_cycle_start
cron.schedule('0 2 * * *', async () => {
  console.log('Checking for billing cycle resets...');
  
  try {
    const result = await masterPool.query(`
      SELECT slug 
      FROM tenants 
      WHERE status = 'active'
        AND DATE_PART('day', CURRENT_DATE) = DATE_PART('day', billing_cycle_start)
    `);
    
    for (const tenant of result.rows) {
      await planService.resetMonthlyUsage(tenant.slug);
      console.log(`Billing cycle reset for: ${tenant.slug}`);
    }
  } catch (error) {
    console.error('Error in billing cycle reset:', error);
  }
});
```

---

## ⚠️ Important Considerations

### 1. Grace Periods
- Don't immediately block at 100% - allow 105-110% buffer
- Show warnings at 75%, 90%, 95%
- Soft limits vs hard limits

### 2. Grandfathering
- Honor existing tenants' current usage if downgrading
- Archive excess data instead of deleting
- Give 30-day notice before enforcement

### 3. Performance
- Cache plan data in Redis (TTL: 1 hour)
- Use database indices on tenant usage queries
- Batch usage updates for high-volume operations

### 4. Error Handling
- Gracefully handle master DB connection failures
- Fallback to allow operations if plan check fails
- Log all plan enforcement events

### 5. Compliance
- GDPR: Allow data export before account suspension
- Store audit trail of plan changes
- Provide clear upgrade path in error messages

---

## 📊 Success Metrics

**Phase 1 Complete When:**
- [ ] All plans defined in database
- [ ] Usage widget shows accurate data
- [ ] No performance degradation

**Phase 2 Complete When:**
- [ ] Hard limits enforced on all resources
- [ ] Upgrade prompts shown when limit reached
- [ ] Zero false positives in limit checks

**Full Implementation Complete When:**
- [ ] All features restricted by plan
- [ ] Monthly reset working correctly
- [ ] Admin can manage tenant plans
- [ ] Upgrade requests processed smoothly
- [ ] 99.9% uptime maintained

---

## 🚀 Quick Start Implementation

For immediate MVP testing, start with these files:

1. **Database:** Run `database/migrations/007_plan_enforcement.sql` (create this)
2. **Backend:** Create `backend/services/planService.js`
3. **Middleware:** Create `backend/middleware/planEnforcement.js`
4. **Routes:** Add to one controller as POC (e.g., customerController)
5. **Frontend:** Add `PlanUsageWidget` to dashboard
6. **Test:** Create test tenant with starter plan and hit limits

Once POC works, systematically roll out to all controllers following the phases above.

---

**Document Created:** April 11, 2026  
**Version:** 1.0  
**Status:** Ready for Implementation
