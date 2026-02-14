# Deploy New Features to Production 🚀

Three major features have been implemented and are ready to deploy!

---

## ✅ What's New

1. **📅 Follow-ups & Future Planning** - Schedule and track future interactions
2. **🔍 Enhanced Proposals** - Customer search + inline customer creation  
3. **⚙️ Admin User Management** - Create and manage users with role-based access

---

## 🚀 Quick Deploy (Copy & Paste)

### Step 1: Commit and Push from Mac

```bash
cd /Users/optimal/CRM/CRM

# First, fix the backend bug (already fixed locally)
git add backend/routes/opportunityActivityRoutes.js

# Add all new features
git add .

# Commit everything
git commit -m "Add Followups, Proposal Search, Admin Panel + Fix backend auth"

# Push to GitHub
git push origin main
```

### Step 2: Deploy to Production Server

Copy this entire block and paste in your terminal:

```bash
ssh -i your-key.pem ubuntu@43.204.98.56 << 'ENDSSH'
cd ~/CRM

echo "=== Pulling Latest Code ==="
git pull origin main

echo ""
echo "=== Restarting Backend ==="
docker-compose restart backend
sleep 10

echo ""
echo "=== Restarting Frontend ==="
docker-compose restart frontend
sleep 5

echo ""
echo "=== Checking Services ==="
docker-compose ps

echo ""
echo "=== Testing Backend ==="
curl http://localhost:5000/health

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "Portal: http://43.204.98.56:5173"
echo "Login: admin@crm.com / admin123"
echo ""
echo "New Features:"
echo "  📅 Follow-ups: /followups"
echo "  📄 Proposals: /proposals (with search)"
echo "  ⚙️ Admin: /admin (admin only)"
ENDSSH
```

---

## 🧪 Test Features After Deploy

### 1. Test Backend Fix
```bash
# Should return {"status":"ok"}
curl http://43.204.98.56:5000/health
```

### 2. Test Follow-ups Module
1. Login: http://43.204.98.56:5173
2. Navigate to "Follow-ups" in sidebar (🔔)
3. Click "+ Schedule Follow-up"
4. Create a test follow-up
5. Verify it appears in the list

### 3. Test Proposal Search
1. Navigate to "Proposals" (📄)
2. Click "+ Create Proposal"
3. Type in customer search box
4. Click "+ Create New Customer"
5. Fill customer form and submit
6. Verify customer is auto-selected
7. Complete proposal creation

### 4. Test Admin Panel
1. Navigate to "Admin" in sidebar (⚙️)
   - Should only be visible if you're logged in as admin
2. Click "+ Create New User"
3. Create a test sales user:
   - Name: "Test Sales"
   - Email: "test.sales@company.com"
   - Password: "test123"
   - Role: Sales
4. Logout
5. Login with new credentials
6. Verify sales user can access system
7. Verify Admin menu is hidden for sales user

---

## 🔍 Troubleshooting

### Backend Not Starting

```bash
# Check logs
ssh -i your-key.pem ubuntu@43.204.98.56
cd ~/CRM
docker-compose logs backend --tail=50
```

**Common Issue**: Still seeing `Router.use() requires a middleware function`
- **Fix**: Make sure the code was pulled correctly
- Run: `git log --oneline -5` to verify latest commit
- Check: `cat backend/routes/opportunityActivityRoutes.js | grep authenticateToken`
  - Should show `authenticateToken`, not `authenticate`

### Frontend Not Loading

```bash
# Restart frontend
docker-compose restart frontend

# Check logs
docker-compose logs frontend --tail=30
```

### Data Not Showing

```bash
# Load sample data (if not already done)
docker-compose exec -T database psql -U crm_user -d crm_database < database/insert_sample_data.sql

# Restart services
docker-compose restart backend frontend
```

---

## 📊 Feature Access Matrix

| Feature | Admin | Sales | User |
|---------|-------|-------|------|
| Dashboard | ✅ | ✅ | ✅ |
| Opportunities | ✅ | ✅ | ✅ |
| Customers | ✅ | ✅ | ✅ |
| Proposals | ✅ | ✅ | ✅ |
| **Follow-ups** | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ |
| **Admin Panel** | ✅ | ❌ | ❌ |

---

## 🎯 Quick Test Script

Run this after deployment to verify everything works:

```bash
# On production server
ssh -i your-key.pem ubuntu@43.204.98.56 << 'ENDSSH'
cd ~/CRM

echo "=== Test 1: Backend Health ==="
curl -s http://localhost:5000/health || echo "FAILED"

echo ""
echo "=== Test 2: Frontend Accessible ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 || echo "FAILED"

echo ""
echo "=== Test 3: Database ==="
docker-compose exec -T database psql -U crm_user -d crm_database -c "SELECT COUNT(*) as users FROM users; SELECT COUNT(*) as customers FROM customers;" || echo "FAILED"

echo ""
echo "=== Test 4: Docker Services ==="
docker-compose ps

echo ""
echo "✅ All tests complete"
ENDSSH
```

---

## 🔐 Admin Access

Default admin credentials (from sample data):
- **Email**: `admin@crm.com`
- **Password**: `admin123`

This account has:
- ✅ Admin role
- ✅ Access to Admin panel
- ✅ Can create/manage users
- ✅ Can change user roles

---

## 📝 Post-Deployment Checklist

- [ ] Backend started successfully
- [ ] Frontend accessible at http://43.204.98.56:5173
- [ ] Login works
- [ ] Dashboard shows data
- [ ] Follow-ups menu visible
- [ ] Can create follow-up
- [ ] Proposals has search function
- [ ] Can create customer inline
- [ ] Admin menu visible (for admin only)
- [ ] Can create new user
- [ ] New user can login
- [ ] Role badges show correctly

---

## 📚 Documentation

Full feature documentation: `NEW_FEATURES_IMPLEMENTED.md`

Includes:
- Detailed feature descriptions
- API endpoints
- Usage examples
- Technical details
- Testing checklists

---

## 🆘 If Something Goes Wrong

### Nuclear Option (Complete Reset)

```bash
cd ~/CRM

# Stop everything
docker-compose down

# Start fresh
docker-compose up -d

# Wait
sleep 30

# Load data
docker-compose exec -T database psql -U crm_user -d crm_database < database/insert_sample_data.sql

# Restart
docker-compose restart

# Check status
docker-compose ps
```

---

## 🎉 Success!

After deployment, you should have:

1. ✅ **Working CRM** with all original features
2. ✅ **Follow-ups Module** for future planning
3. ✅ **Enhanced Proposals** with customer search
4. ✅ **Admin Panel** for user management
5. ✅ **Role-Based Access** (Admin, User, Sales)
6. ✅ **Fixed Backend** (no more crashes)
7. ✅ **Sample Data** loaded

**Your CRM is now production-ready!** 🚀

---

**Need help?** Check the logs:
```bash
docker-compose logs backend --tail=50
docker-compose logs frontend --tail=30
```
