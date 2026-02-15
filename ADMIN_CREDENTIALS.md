# 🔐 Buzeye Admin Credentials

## Fresh Admin Account Created

**Email:** `admin@buzeye.com`  
**Password:** `Buzeye@2026`

---

## How to Apply

### Method 1: Docker (Recommended)
```bash
cd /Users/optimal/CRM/CRM

# Apply the admin reset script
docker exec -i crm_database psql -U postgres crm < database/reset_admin.sql

# Restart backend (just in case)
docker-compose restart backend
```

### Method 2: Direct PostgreSQL
```bash
# If you have psql installed locally
psql -h localhost -p 5432 -U postgres crm < database/reset_admin.sql
```

### Method 3: Manual (via Docker shell)
```bash
# Enter the database container
docker exec -it crm_database psql -U postgres crm

# Run these commands:
DELETE FROM users WHERE email IN ('admin@buzeye.com', 'admin@crm.com');

INSERT INTO users (email, password, full_name, role)
VALUES (
    'admin@buzeye.com',
    '$2a$10$5XAS7tIOlsDVD3/hfg73j.4oR.p5iMqpPdJu9/Pdj/MUIT2EnDBXW',
    'Buzeye Admin',
    'admin'
);

# Exit with \q
```

---

## Testing Login

1. **Open your browser**
   - Local: http://localhost:5173
   - Production: http://buzeye.com

2. **Enter credentials:**
   - Email: `admin@buzeye.com`
   - Password: `Buzeye@2026`

3. **You should see:**
   - Dashboard loads successfully
   - User profile shows "Buzeye Admin" with Admin role badge

---

## Troubleshooting

### "Invalid credentials" error

**Check if user exists:**
```bash
docker exec -it crm_database psql -U postgres crm -c "SELECT email, full_name, role FROM users WHERE email='admin@buzeye.com';"
```

**Expected output:**
```
        email         |   full_name   | role
----------------------+---------------+-------
 admin@buzeye.com     | Buzeye Admin  | admin
```

If no user found, run the reset script again.

### "Cannot connect to backend" error

**Check backend logs:**
```bash
docker logs crm_backend
```

**Restart backend:**
```bash
docker-compose restart backend
```

### Database connection issues

**Check if database is running:**
```bash
docker ps | grep crm_database
```

**Check database logs:**
```bash
docker logs crm_database
```

---

## Security Notes

⚠️ **Important Security Recommendations:**

1. **Change password after first login**
   - Go to Profile/Settings
   - Update to a unique, strong password
   - Don't share with unauthorized users

2. **For production:**
   - Use a strong, unique password (at least 16 characters)
   - Enable 2FA if implementing later
   - Regularly rotate admin passwords
   - Monitor admin account activity

3. **Password requirements:**
   - Minimum 8 characters
   - Mix of uppercase, lowercase, numbers, special characters
   - Not based on dictionary words

---

## Creating Additional Users

### Via Admin Panel
1. Login as admin
2. Go to **Admin** section (⚙️ in sidebar)
3. Click **+ Create User**
4. Fill in details and select role:
   - **Admin** - Full access to everything
   - **Sales** - Manage customers, opportunities, sales
   - **User** - View-only access

### Via SQL
```sql
-- Example: Create a sales user
INSERT INTO users (email, password, full_name, role)
VALUES (
    'sales@buzeye.com',
    '$2a$10$5XAS7tIOlsDVD3/hfg73j.4oR.p5iMqpPdJu9/Pdj/MUIT2EnDBXW',  -- Same: Buzeye@2026
    'Sales Manager',
    'sales'
);
```

---

## Old Credentials (Deprecated)

❌ **These no longer work:**
- `admin@crm.com` / `admin123` (old demo account - deleted)

✅ **Use new credentials:**
- `admin@buzeye.com` / `Buzeye@2026`

---

## Quick Reference

| Field | Value |
|-------|-------|
| **Email** | admin@buzeye.com |
| **Password** | Buzeye@2026 |
| **Name** | Buzeye Admin |
| **Role** | Admin (Full Access) |
| **Created** | January 2026 |

---

## Password Reset (Future)

If you forget the password later, you can:

1. **Generate new hash:**
   ```bash
   cd /Users/optimal/CRM/CRM/backend
   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YourNewPassword', 10));"
   ```

2. **Update in database:**
   ```sql
   UPDATE users 
   SET password = 'PASTE_NEW_HASH_HERE'
   WHERE email = 'admin@buzeye.com';
   ```

---

*Admin credentials created: January 13, 2026*  
*System: Buzeye CRM v1.0*
