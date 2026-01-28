# Apply New Features - Quick Guide

Follow these steps to activate all the new CRM features.

## 🚀 Quick Start (5 Minutes)

### Step 1: Apply Database Schema

```bash
cd /Users/optimal/CRM/CRM

# Copy enhanced schema to database folder
cp database/enhanced_schema.sql database/

# Apply to running Docker database
docker-compose exec -T database psql -U crm_user -d crm_database < database/enhanced_schema.sql
```

**Expected Output:**
```
CREATE TABLE
CREATE TABLE
CREATE INDEX
...
INSERT 0 4
```

### Step 2: Restart Backend

```bash
# Restart to load new routes
docker-compose restart backend

# Watch logs to confirm
docker-compose logs -f backend
```

**Look for:**
```
🚀 CRM Backend Server Started
Server running on port: 5000
```

### Step 3: Test New Endpoints

Open a new terminal and test:

```bash
# Login first to get token
curl -X POST http://43.204.98.56:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"admin123"}'

# Copy the token from response, then:
TOKEN="YOUR_TOKEN_HERE"

# Test opportunities
curl http://43.204.98.56:5000/api/opportunities \
  -H "Authorization: Bearer $TOKEN"

# Test leads
curl http://43.204.98.56:5000/api/leads \
  -H "Authorization: Bearer $TOKEN"

# Test reminders
curl http://43.204.98.56:5000/api/reminders \
  -H "Authorization: Bearer $TOKEN"

# Test revenue forecast
curl http://43.204.98.56:5000/api/opportunities/revenue-forecast \
  -H "Authorization: Bearer $TOKEN"
```

## ✅ What You Get

### New API Endpoints (40+):

**Opportunities:**
- `/api/opportunities` - CRUD operations
- `/api/opportunities/pipeline-metrics` - Pipeline stats
- `/api/opportunities/revenue-forecast` - Next month forecast

**Leads:**
- `/api/leads` - CRUD operations
- `/api/leads/metrics` - Lead analytics

**Follow-ups:**
- `/api/followups` - CRUD operations
- `/api/followups/missed` - Alert for missed items
- `/api/followups/upcoming` - Due soon

**Reminders:**
- `/api/reminders` - User reminders
- `/api/reminders/due` - Dashboard alerts

### Sample Data Included:

- ✅ 4 Opportunities (various pipeline stages)
- ✅ 5 Leads (different statuses)
- ✅ 6 Follow-ups (some due, some pending)
- ✅ 3 Reminders
- ✅ Activity logs
- ✅ Conversion tracking

### New Database Tables:

1. `opportunities` - Sales pipeline
2. `leads` - Lead management
3. `followups` - Schedule tracking
4. `reminders` - User alerts
5. `conversion_tracking` - Analytics
6. `activity_log` - Audit trail

## 🎨 Frontend Integration (Next Step)

The backend is ready! To add frontend pages:

### 1. Add API Service Methods

Update `frontend/src/services/api.js`:

```javascript
// Opportunities API
export const opportunitiesAPI = {
  getAll: () => api.get('/opportunities'),
  getById: (id) => api.get(`/opportunities/${id}`),
  create: (data) => api.post('/opportunities', data),
  update: (id, data) => api.put(`/opportunities/${id}`, data),
  delete: (id) => api.delete(`/opportunities/${id}`),
  getPipelineMetrics: () => api.get('/opportunities/pipeline-metrics'),
  getRevenueForecast: () => api.get('/opportunities/revenue-forecast'),
};

// Leads API
export const leadsAPI = {
  getAll: () => api.get('/leads'),
  getMetrics: () => api.get('/leads/metrics'),
  create: (data) => api.post('/leads', data),
  // ... etc
};

// Follow-ups API
export const followupsAPI = {
  getAll: () => api.get('/followups'),
  getMissed: () => api.get('/followups/missed'),
  getUpcoming: () => api.get('/followups/upcoming'),
  // ... etc
};

// Reminders API
export const remindersAPI = {
  getAll: () => api.get('/reminders'),
  getDue: () => api.get('/reminders/due'),
  // ... etc
};
```

### 2. Create New Pages

```bash
cd frontend/src/pages

# Create new page files (examples provided in NEW_FEATURES_GUIDE.md)
# - Opportunities.jsx
# - Leads.jsx
# - EnhancedDashboard.jsx
```

### 3. Add Routes

Update `frontend/src/App.jsx`:

```javascript
import Opportunities from './pages/Opportunities';
import Leads from './pages/Leads';

// In Routes:
<Route path="opportunities" element={<Opportunities />} />
<Route path="leads" element={<Leads />} />
```

### 4. Update Navigation

Update `frontend/src/components/Layout.jsx`:

```javascript
const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/opportunities', label: 'Opportunities', icon: '💼' },
  { path: '/leads', label: 'Leads', icon: '🎯' },
  { path: '/customers', label: 'Customers', icon: '👥' },
  // ... existing items
];
```

## 🔍 Verify Everything Works

### Check Database:

```bash
docker-compose exec database psql -U crm_user -d crm_database

# In psql:
\dt  # List tables - should see new tables
SELECT COUNT(*) FROM opportunities;  # Should return 4
SELECT COUNT(*) FROM leads;  # Should return 5
\q  # Exit
```

### Check Backend Routes:

```bash
# Should see new routes in logs
docker-compose logs backend | grep "opportunities\|leads\|followups\|reminders"
```

### Test API Responses:

All endpoints should return JSON data, not errors.

## 📊 Example API Responses

### Opportunities:
```json
{
  "opportunities": [
    {
      "id": 1,
      "title": "Enterprise CRM Upgrade",
      "value": "45000.00",
      "pipeline_stage": "proposal",
      "closing_probability": 75,
      "customer_name": "Tech Solutions Inc",
      "urgency_status": "due_soon"
    }
  ]
}
```

### Revenue Forecast:
```json
{
  "forecast": {
    "forecasted_revenue": "85500.00",
    "opportunity_count": 4,
    "potential_revenue": "116000.00"
  },
  "conversion_rate": "35.5"
}
```

### Missed Follow-ups:
```json
{
  "missed_followups": [
    {
      "id": 1,
      "followup_type": "call",
      "followup_date": "2026-01-10T10:00:00",
      "related_to_name": "Tech Solutions Inc",
      "status": "pending"
    }
  ]
}
```

## 🐛 Troubleshooting

### Database Connection Error:
```bash
docker-compose restart database
docker-compose restart backend
```

### Route Not Found:
```bash
# Make sure backend restarted after adding routes
docker-compose restart backend
```

### Schema Already Exists:
```bash
# Safe to run - uses IF NOT EXISTS
# Just rerun the schema file
```

### Empty Results:
```bash
# Check if sample data inserted
docker-compose exec database psql -U crm_user -d crm_database \
  -c "SELECT COUNT(*) FROM opportunities"
```

## 📚 Documentation

- **Full Feature Guide:** `NEW_FEATURES_GUIDE.md`
- **Database Schema:** `database/enhanced_schema.sql`
- **API Controllers:** `backend/controllers/*Controller.js`
- **API Routes:** `backend/routes/*Routes.js`

## ✅ Completion Checklist

- [ ] Database schema applied (Step 1)
- [ ] Backend restarted (Step 2)
- [ ] API endpoints tested (Step 3)
- [ ] All endpoints return data (no 404s)
- [ ] Sample data visible in responses
- [ ] Ready for frontend integration

## 🎉 Success!

Your backend now supports:

✅ Opportunities & Pipeline Management
✅ Lead Tracking & Management
✅ Follow-up Scheduling & Alerts
✅ Reminders & Notifications
✅ Revenue Forecasting
✅ Conversion Tracking
✅ Activity Logging
✅ Role-Based Data Access

**Next:** Build the frontend pages using the NEW_FEATURES_GUIDE.md

---

Need help? Check NEW_FEATURES_GUIDE.md for detailed documentation!
