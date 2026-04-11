const express = require('express');
const router = express.Router();
const planService = require('../services/planService');
const masterPool = require('../config/masterDatabase');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { extractTenantFromRequest } = require('../middleware/planEnforcement');

/**
 * GET /api/plan/current
 * Get current plan and usage for logged-in tenant
 */
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const tenantSlug = extractTenantFromRequest(req);
    
    if (!tenantSlug) {
      return res.status(400).json({ 
        error: 'No tenant context found' 
      });
    }
    
    const summary = await planService.getUsageSummary(tenantSlug);
    
    res.json({ 
      success: true, 
      data: summary 
    });
  } catch (error) {
    console.error('Error fetching current plan:', error);
    res.status(500).json({ 
      error: 'Failed to fetch plan information',
      message: error.message 
    });
  }
});

/**
 * GET /api/plan/available
 * Get all available plans for upgrade comparison
 */
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const result = await masterPool.query(`
      SELECT 
        plan_name, 
        display_name, 
        price_inr, 
        price_period, 
        limits, 
        features
      FROM plan_configurations
      WHERE is_active = true
      ORDER BY sort_order ASC
    `);
    
    res.json({ 
      success: true, 
      plans: result.rows 
    });
  } catch (error) {
    console.error('Error fetching available plans:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available plans',
      message: error.message 
    });
  }
});

/**
 * POST /api/plan/request-upgrade
 * Request plan upgrade (creates ticket for admin approval)
 */
router.post('/request-upgrade', authenticateToken, async (req, res) => {
  try {
    const tenantSlug = extractTenantFromRequest(req);
    const { targetPlan, notes } = req.body;
    
    if (!tenantSlug) {
      return res.status(400).json({ 
        error: 'No tenant context found' 
      });
    }
    
    if (!targetPlan) {
      return res.status(400).json({ 
        error: 'Target plan is required' 
      });
    }
    
    // Validate target plan exists
    const planCheck = await masterPool.query(
      'SELECT 1 FROM plan_configurations WHERE plan_name = $1 AND is_active = true',
      [targetPlan]
    );
    
    if (planCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid plan selected' 
      });
    }
    
    // Check if there's already a pending request
    const existingRequest = await masterPool.query(`
      SELECT id FROM plan_change_requests 
      WHERE tenant_slug = $1 
        AND status = 'pending'
      LIMIT 1
    `, [tenantSlug]);
    
    if (existingRequest.rows.length > 0) {
      return res.status(400).json({
        error: 'You already have a pending upgrade request',
        message: 'Please wait for admin approval or contact support'
      });
    }
    
    // Get current plan
    const tenant = await planService.getTenantPlan(tenantSlug);
    
    // Create upgrade request
    const result = await masterPool.query(`
      INSERT INTO plan_change_requests (
        tenant_slug, 
        current_plan, 
        requested_plan, 
        requested_by,
        admin_notes,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id
    `, [
      tenantSlug, 
      tenant.plan, 
      targetPlan, 
      req.user.email,
      notes || null
    ]);
    
    res.json({ 
      success: true, 
      message: 'Upgrade request submitted successfully. Our team will contact you shortly.',
      requestId: result.rows[0].id
    });
    
    // TODO: Send notification email to admin
    
  } catch (error) {
    console.error('Error requesting upgrade:', error);
    res.status(500).json({ 
      error: 'Failed to submit upgrade request',
      message: error.message 
    });
  }
});

/**
 * GET /api/plan/usage-details
 * Get detailed usage breakdown
 */
router.get('/usage-details', authenticateToken, async (req, res) => {
  try {
    const tenantSlug = extractTenantFromRequest(req);
    
    if (!tenantSlug) {
      return res.status(400).json({ 
        error: 'No tenant context found' 
      });
    }
    
    const tenant = await planService.getTenantPlan(tenantSlug);
    const limits = tenant.plan_limits || {};
    const usage = tenant.current_usage || {};
    
    // Build detailed breakdown
    const details = Object.keys(limits).map(limitKey => {
      const usageKey = planService.getLimitUsageKey(limitKey);
      const limit = limits[limitKey];
      const current = usage[usageKey] || 0;
      const unlimited = limit === -1;
      
      return {
        type: limitKey,
        label: planService.getLimitLabel(limitKey),
        limit: unlimited ? 'Unlimited' : limit,
        current,
        remaining: unlimited ? 'Unlimited' : Math.max(0, limit - current),
        percent: unlimited ? 0 : (limit > 0 ? Math.round((current / limit) * 100) : 0),
        unlimited,
        status: unlimited ? 'unlimited' :
                (current >= limit) ? 'exceeded' :
                (current >= limit * 0.9) ? 'critical' :
                (current >= limit * 0.75) ? 'warning' : 'ok'
      };
    });
    
    res.json({
      success: true,
      data: {
        plan: tenant.plan,
        displayName: tenant.display_name,
        details,
        lastReset: usage.last_reset_date,
        billingCycleStart: tenant.billing_cycle_start
      }
    });
    
  } catch (error) {
    console.error('Error fetching usage details:', error);
    res.status(500).json({
      error: 'Failed to fetch usage details',
      message: error.message
    });
  }
});

/**
 * ADMIN ROUTES
 * Routes for super admin to manage tenant plans
 */

/**
 * GET /api/plan/admin/requests
 * Get all pending upgrade requests (Admin only)
 */
router.get('/admin/requests', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        pcr.*,
        t.name as tenant_name,
        pc_current.display_name as current_plan_name,
        pc_current.price_inr as current_price,
        pc_requested.display_name as requested_plan_name,
        pc_requested.price_inr as requested_price
      FROM plan_change_requests pcr
      LEFT JOIN tenants t ON pcr.tenant_slug = t.slug
      LEFT JOIN plan_configurations pc_current ON pcr.current_plan = pc_current.plan_name
      LEFT JOIN plan_configurations pc_requested ON pcr.requested_plan = pc_requested.plan_name
    `;
    
    const params = [];
    if (status) {
      query += ' WHERE pcr.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY pcr.created_at DESC';
    
    const result = await masterPool.query(query, params);
    
    res.json({
      success: true,
      requests: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching upgrade requests:', error);
    res.status(500).json({
      error: 'Failed to fetch upgrade requests',
      message: error.message
    });
  }
});

/**
 * PUT /api/plan/admin/requests/:id/approve
 * Approve upgrade request (Admin only)
 */
router.put('/admin/requests/:id/approve', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    
    // Get request details
    const request = await masterPool.query(
      'SELECT * FROM plan_change_requests WHERE id = $1',
      [id]
    );
    
    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const requestData = request.rows[0];
    
    if (requestData.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Request already processed',
        status: requestData.status 
      });
    }
    
    // Update tenant plan
    await masterPool.query(
      'UPDATE tenants SET plan = $1, updated_at = CURRENT_TIMESTAMP WHERE slug = $2',
      [requestData.requested_plan, requestData.tenant_slug]
    );
    
    // Mark request as approved
    await masterPool.query(`
      UPDATE plan_change_requests 
      SET status = 'approved',
          admin_notes = $1,
          processed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [adminNotes || 'Approved', id]);
    
    res.json({
      success: true,
      message: 'Upgrade request approved and plan updated'
    });
    
    // TODO: Send notification email to tenant
    
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      error: 'Failed to approve request',
      message: error.message
    });
  }
});

/**
 * PUT /api/plan/admin/tenants/:slug/change-plan
 * Directly change tenant plan (Admin only)
 */
router.put('/admin/tenants/:slug/change-plan', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { slug } = req.params;
    const { newPlan } = req.body;
    
    if (!newPlan) {
      return res.status(400).json({ error: 'New plan is required' });
    }
    
    // Validate plan exists
    const planCheck = await masterPool.query(
      'SELECT 1 FROM plan_configurations WHERE plan_name = $1',
      [newPlan]
    );
    
    if (planCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    // Update tenant plan (trigger will sync limits automatically)
    await masterPool.query(
      'UPDATE tenants SET plan = $1, updated_at = CURRENT_TIMESTAMP WHERE slug = $2',
      [newPlan, slug]
    );
    
    res.json({
      success: true,
      message: 'Tenant plan updated successfully'
    });
    
  } catch (error) {
    console.error('Error changing tenant plan:', error);
    res.status(500).json({
      error: 'Failed to change tenant plan',
      message: error.message
    });
  }
});

module.exports = router;
