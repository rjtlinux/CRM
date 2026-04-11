const planService = require('../services/planService');

/**
 * Extract tenant slug from request
 * Checks subdomain from host header
 */
function extractTenantFromRequest(req) {
  // Option 1: From JWT (if we added tenantSlug during login)
  if (req.user && req.user.tenantSlug) {
    return req.user.tenantSlug;
  }
  
  // Option 2: From subdomain
  const host = req.get('host') || '';
  const parts = host.split('.');
  
  // Handle localhost and development
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    // For local development, you can set env variable
    return process.env.DEV_TENANT_SLUG || 'dev';
  }
  
  // Skip 'admin' and 'www' subdomains
  const subdomain = parts[0];
  if (subdomain === 'admin' || subdomain === 'www' || parts.length < 2) {
    return null; // No tenant context
  }
  
  return subdomain;
}

/**
 * Middleware: Check if tenant can perform action based on plan limits
 * Usage: router.post('/customers', checkPlanLimit('max_customers'), ...)
 * 
 * @param {string} limitType - Type of limit to check (e.g., 'max_customers')
 * @returns {Function} Express middleware
 */
const checkPlanLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      const tenantSlug = extractTenantFromRequest(req);
      
      // Skip check if no tenant context (e.g., admin panel)
      if (!tenantSlug) {
        return next();
      }
      
      const limitCheck = await planService.checkLimit(tenantSlug, limitType);
      
      // If check failed due to error, fail open (allow operation)
      if (limitCheck.error) {
        console.warn(`Plan limit check failed for ${tenantSlug}, allowing operation`);
        return next();
      }
      
      if (!limitCheck.allowed) {
        const upgradePath = planService.getUpgradePath(req.user?.plan || 'starter');
        
        return res.status(403).json({
          error: 'Plan limit reached',
          message: `You have reached your plan limit for ${planService.getLimitLabel(limitType)}`,
          limit: limitCheck.limit,
          current: limitCheck.current,
          upgradeRequired: true,
          upgradePath,
          limitType
        });
      }
      
      // Attach limit info to request for logging
      req.planLimit = limitCheck;
      
      // Warn if approaching limit (90%+)
      if (limitCheck.percentUsed >= 90 && !limitCheck.unlimited) {
        console.warn(`⚠️ Tenant ${tenantSlug} at ${limitCheck.percentUsed}% of ${limitType}`);
      }
      
      next();
    } catch (error) {
      console.error('Plan limit check error:', error);
      // Fail open - allow operation if check fails
      next();
    }
  };
};

/**
 * Middleware: Check if tenant has access to specific feature
 * Usage: router.post('/whatsapp/send', checkPlanFeature('whatsapp'), ...)
 * 
 * @param {string} featureName - Feature to check (e.g., 'whatsapp', 'ai_voice')
 * @returns {Function} Express middleware
 */
const checkPlanFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const tenantSlug = extractTenantFromRequest(req);
      
      // Skip check if no tenant context
      if (!tenantSlug) {
        return next();
      }
      
      const hasFeature = await planService.checkFeature(tenantSlug, featureName);
      
      if (!hasFeature) {
        const upgradePath = planService.getUpgradePath(req.user?.plan || 'starter');
        
        return res.status(403).json({
          error: 'Feature not available',
          message: `${featureName.replace('_', ' ')} is not available in your current plan`,
          feature: featureName,
          upgradeRequired: true,
          upgradePath
        });
      }
      
      next();
    } catch (error) {
      console.error('Plan feature check error:', error);
      // Fail closed - deny access if check fails for sensitive features
      const criticalFeatures = ['api_access', 'custom_integrations'];
      if (criticalFeatures.includes(featureName)) {
        return res.status(403).json({
          error: 'Feature access check failed',
          message: 'Unable to verify feature access. Please try again.'
        });
      }
      // Fail open for non-critical features
      next();
    }
  };
};

/**
 * Middleware: Track usage after successful operation
 * Should be called AFTER the operation completes successfully
 * Usage: Attach after controller logic or use in success callback
 * 
 * @param {string} usageType - Type of usage to track (e.g., 'customers_count')
 * @param {string} operation - 'increment' or 'decrement'
 * @returns {Function} Express middleware
 */
const trackUsage = (usageType, operation = 'increment') => {
  return async (req, res, next) => {
    try {
      const tenantSlug = extractTenantFromRequest(req);
      
      if (!tenantSlug) {
        return next();
      }
      
      if (operation === 'increment') {
        await planService.incrementUsage(tenantSlug, usageType);
      } else if (operation === 'decrement') {
        await planService.decrementUsage(tenantSlug, usageType);
      }
      
      next();
    } catch (error) {
      console.error('Usage tracking error:', error);
      // Don't fail the request - usage tracking is non-critical
      next();
    }
  };
};

/**
 * Helper: Manually track usage (for use in controllers)
 * Useful when you need conditional tracking or custom logic
 * 
 * @param {Object} req - Express request object
 * @param {string} usageType - Type of usage to track
 * @param {number} amount - Amount to increment/decrement
 * @param {string} operation - 'increment' or 'decrement'
 */
const manualTrackUsage = async (req, usageType, amount = 1, operation = 'increment') => {
  try {
    const tenantSlug = extractTenantFromRequest(req);
    if (!tenantSlug) return;
    
    if (operation === 'increment') {
      await planService.incrementUsage(tenantSlug, usageType, amount);
    } else {
      await planService.decrementUsage(tenantSlug, usageType, amount);
    }
  } catch (error) {
    console.error('Manual usage tracking error:', error);
  }
};

/**
 * Middleware: Add tenant context to request object
 * Useful for controllers that need tenant info
 */
const attachTenantContext = async (req, res, next) => {
  try {
    const tenantSlug = extractTenantFromRequest(req);
    
    if (!tenantSlug) {
      req.tenant = null;
      return next();
    }
    
    const planData = await planService.getTenantPlan(tenantSlug);
    
    req.tenant = {
      slug: tenantSlug,
      plan: planData.plan,
      limits: planData.plan_limits,
      features: planData.features,
      usage: planData.current_usage
    };
    
    next();
  } catch (error) {
    console.error('Error attaching tenant context:', error);
    req.tenant = null;
    next();
  }
};

module.exports = {
  checkPlanLimit,
  checkPlanFeature,
  trackUsage,
  manualTrackUsage,
  extractTenantFromRequest,
  attachTenantContext
};
