# Plan-Based Access Control - Setup Guide

## 🎯 Overview

This guide walks you through setting up the plan-based access control system that was just implemented. This system restricts tenant access based on their subscription plan (Starter, Professional, Enterprise).

## ✅ What Was Implemented

### Phase 1: Foundation (COMPLETED)

1. ✅ **Database Migration** (`database/migrations/007_plan_enforcement.sql`)
   - Plan configurations table
   - Tenant usage tracking
   - Plan change requests
   - Auto-sync triggers

2. ✅ **Backend Services**
   - `backend/config/masterDatabase.js` - Master DB connection
   - `backend/services/planService.js` - Core plan logic & usage tracking
   - `backend/middleware/planEnforcement.js` - Limit & feature checks
   - `backend/routes/planRoutes.js` - Plan management APIs

3. ✅ **Frontend Components**
   - `frontend/src/components/PlanUsageWidget.jsx` - Usage dashboard widget
   - Integrated into Dashboard page

---

## 📋 Setup Instructions

### Step 1: Environment Variables

Add these to your `.env` file:

```bash
# Master Database (for tenant registry and plan management)
MASTER_DB_HOST=localhost
MASTER_DB_PORT=5432
MASTER_DB_NAME=crm_master
MASTER_DB_USER=your_db_user
MASTER_DB_PASSWORD=your_db_password

# OR use existing DB_ variables (will fallback to these)
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=your_db_user
# DB_PASSWORD=your_db_password

# For local development, set tenant slug
DEV_TENANT_SLUG=dev
```

### Step 2: Run Database Migration

**Option A: If you have a master database already**

```bash
# Connect to your master database
psql -U your_db_user -d crm_master

# Run the migration
\i database/migrations/007_plan_enforcement.sql
```

**Option B: Create master database first**

```bash
# Create master database
createdb -U your_db_user crm_master

# Run the master tenants migration first
psql -U your_db_user -d crm_master < database/migrations/006_master_tenants.sql

# Then run plan enforcement migration
psql -U your_db_user -d crm_master < database/migrations/007_plan_enforcement.sql
```

**Verify:**
```sql
-- Check plan configurations
SELECT plan_name, display_name, price_inr FROM plan_configurations;

-- Should show: starter, professional, enterprise

-- Check tenants have plan_limits
SELECT slug, plan, plan_limits->>'max_customers' as max_customers 
FROM tenants LIMIT 5;
```

### Step 3: Install Dependencies (if needed)

The existing `package.json` should already have `pg` (PostgreSQL driver). If not:

```bash
cd backend
npm install pg
```

### Step 4: Restart Backend Server

```bash
cd backend
npm run dev
# OR for production
npm start
```

**Verify startup logs:**
```
✅ Database connected successfully
✅ Master database connected successfully
```

### Step 5: Test API Endpoints

```bash
# Get current plan and usage
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/plan/current

# Get available plans
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/plan/available

# Test response should show:
# {
#   "success": true,
#   "data": {
#     "plan": { "name": "starter", ... },
#     "limits": { "max_customers": 500, ... },
#     "usage": { "customers_count": 0, ... },
#     ...
#   }
# }
```

### Step 6: Test Frontend Widget

1. Navigate to Dashboard: `http://localhost:5173/`
2. Login with your credentials
3. You should see the **Plan Usage Widget** in the dashboard
4. It should show:
   - Your current plan (e.g., "Starter Plan - ₹999/month")
   - Usage bars for customers, users, transactions
   - Warning messages if approaching limits

---

## 🧪 Testing the Plan System

### Test 1: Check Limits

```javascript
// In your browser console or via API test tool
fetch('/api/plan/current', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
}).then(r => r.json()).then(console.log);
```

**Expected output:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "name": "starter",
      "displayName": "Starter",
      "price": 999,
      "status": "active"
    },
    "limits": {
      "max_customers": 500,
      "max_users": 2,
      "max_transactions_monthly": 1000,
      "max_opportunities": 50,
      "max_proposals": 20,
      "max_ai_commands_monthly": 100
    },
    "usage": {
      "customers_count": 12,
      "users_count": 1,
      "transactions_this_month": 24,
      "opportunities_count": 5,
      "proposals_count": 2,
      "ai_commands_this_month": 10
    },
    "warnings": [],
    "features": {
      "whatsapp": false,
      "ai_voice": false,
      "advanced_analytics": false,
      "custom_reports": false,
      "api_access": false,
      "priority_support": false
    }
  }
}
```

### Test 2: Enforce Limits (Coming in Phase 2)

To actually enforce limits on customer creation, you need to:

1. Add middleware to customer routes:

```javascript
// In backend/routes/customerRoutes.js
const { checkPlanLimit } = require('../middleware/planEnforcement');

router.post('/', 
  authenticateToken,
  sanitize,
  checkPlanLimit('max_customers'), // Add this line
  [validateCustomer()],
  validate,
  createCustomer
);
```

2. Track usage after creation:

```javascript
// In backend/controllers/customerController.js
const { manualTrackUsage } = require('../middleware/planEnforcement');

const createCustomer = async (req, res) => {
  try {
    // ... existing create logic ...
    
    // Track usage after successful creation
    await manualTrackUsage(req, 'customers_count', 1, 'increment');
    
    res.status(201).json({ success: true, customer: result.rows[0] });
  } catch (error) {
    // ... error handling ...
  }
};
```

### Test 3: Upgrade Request

```bash
curl -X POST http://localhost:5000/api/plan/request-upgrade \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetPlan": "professional", "notes": "Need more users"}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Upgrade request submitted successfully. Our team will contact you shortly.",
  "requestId": 1
}
```

---

## 🔧 Troubleshooting

### Issue 1: "Master database not found"

**Solution:**
```bash
# Create the master database
createdb -U postgres crm_master

# Run migrations
psql -U postgres -d crm_master < database/migrations/006_master_tenants.sql
psql -U postgres -d crm_master < database/migrations/007_plan_enforcement.sql
```

### Issue 2: "No tenant context found"

This happens in development when subdomain extraction fails.

**Solution:**
Set environment variable:
```bash
# In .env
DEV_TENANT_SLUG=dev

# Or modify your hosts file
# /etc/hosts
127.0.0.1 dev.localhost
```

Then access via: `http://dev.localhost:5173`

### Issue 3: Plan widget not showing

**Debug steps:**
1. Check browser console for errors
2. Verify API endpoint: `/api/plan/current`
3. Check that component is imported in Dashboard
4. Verify JWT token includes user info

### Issue 4: "TypeError: Cannot read property 'plan_limits' of undefined"

The tenant doesn't have plan_limits synced.

**Solution:**
```sql
-- Update tenant with plan limits
UPDATE tenants t
SET plan_limits = pc.limits
FROM plan_configurations pc
WHERE pc.plan_name = t.plan
  AND t.slug = 'your_tenant_slug';
```

---

## 📊 Next Steps (Phase 2)

To fully enforce plan limits on all operations:

1. **Add limit checks to controllers:**
   - Customer creation/deletion
   - User creation
   - Opportunity/Proposal creation
   - Sales/Transaction creation
   - AI command execution

2. **Add feature checks:**
   - WhatsApp endpoints
   - AI voice endpoints
   - Custom reports
   - API access

3. **Setup monthly reset cron job:**
   - Create `/backend/cron/resetMonthlyUsage.js`
   - Schedule viacron or task scheduler
   - Run on 1st of every month

4. **Build admin panel:**
   - View all tenant usage
   - Approve upgrade requests
   - Manually change tenant plans
   - Generate usage reports

---

## 🎓 Usage Examples

### Example 1: Check if user can create customer

```javascript
// In customerController.js
const { checkPlanLimit, manualTrackUsage } = require('../middleware/planEnforcement');

router.post('/customers', authenticateToken, async (req, res) => {
  const tenantSlug = extractTenantFromRequest(req);
  
  // Check limit before creating
  const limitCheck = await planService.checkLimit(tenantSlug, 'max_customers');
  
  if (!limitCheck.allowed) {
    return res.status(403).json({
      error: 'Customer limit reached',
      limit: limitCheck.limit,
      current: limitCheck.current,
      upgradeRequired: true
    });
  }
  
  // Create customer...
  const customer = await createCustomer(data);
  
  // Track usage
  await manualTrackUsage(req, 'customers_count', 1, 'increment');
  
  res.json({ success: true, customer });
});
```

### Example 2: Check feature access

```javascript
// In whatsappController.js
const { checkPlanFeature } = require('../middleware/planEnforcement');

router.post('/whatsapp/send', 
  authenticateToken,
  checkPlanFeature('whatsapp'), // Blocks if feature not in plan
  async (req, res) => {
    // Send WhatsApp message...
  }
);
```

### Example 3: Show upgrade prompt in UI

```jsx
// In frontend component
const { data: planData } = await api.get('/plan/current');

if (planData.data.usage.customers_count >= planData.data.limits.max_customers) {
  showUpgradeModal({
    message: 'You have reached your customer limit',
    currentPlan: planData.data.plan.name,
    upgradeTo: 'professional'
  });
}
```

---

## 📝 Summary

**What's Working Now:**
✅ Database schema for plans and usage
✅ Backend API for plan info
✅ Frontend widget showing usage
✅ Basic infrastructure in place

**What Needs Phase 2 (Optional):**
⏳ Actual enforcement on all endpoints
⏳ Monthly usage resets
⏳ Admin panel for plan management
⏳ Upgrade approval workflow

**Start Using:**
1. Run migration
2. Restart backend
3. View widget in dashboard
4. Start adding `checkPlanLimit()` to routes as needed

---

**Questions?** Check `PLAN_BASED_ACCESS_IMPLEMENTATION.md` for full implementation details.

**Created:** April 11, 2026  
**Status:** Phase 1 Complete, Ready for Testing
