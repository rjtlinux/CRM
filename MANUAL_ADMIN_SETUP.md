# 🔧 Manual Admin Setup - Buzeye

## The login is failing because the admin user doesn't exist in the database yet.

---

## ✅ Quick Fix - Run This ONE Command

On your production server, run:

```bash
cd /home/ubuntu/CRM

docker exec -i crm_database psql -U crm_user -d crm_database <<'EOF'
DELETE FROM users WHERE email IN ('admin@buzeye.com', 'admin@crm.com');

INSERT INTO users (email, password, full_name, role, created_at, updated_at)
VALUES (
    'admin@buzeye.com',
    '$2a$10$5XAS7tIOlsDVD3/hfg73j.4oR.p5iMqpPdJu9/Pdj/MUIT2EnDBXW',
    'Buzeye Admin',
    'admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

SELECT id, email, full_name, role FROM users WHERE email = 'admin@buzeye.com';
EOF
```

---

## Or Use the Script

```bash
cd /home/ubuntu/CRM
git pull origin main
chmod +x CREATE_ADMIN_DIRECT.sh
./CREATE_ADMIN_DIRECT.sh
```

---

## Verify Admin User Exists

After running the command, verify:

```bash
docker exec -i crm_database psql -U crm_user -d crm_database -c "SELECT id, email, full_name, role FROM users WHERE email = 'admin@buzeye.com';"
```

**Expected output:**
```
 id |       email         |   full_name   | role  
----+--------------------+---------------+-------
  1 | admin@buzeye.com   | Buzeye Admin  | admin
```

---

## Then Try Login Again

1. Go to: http://buzeye.com:5173/login
2. Enter:
   - Email: `admin@buzeye.com`
   - Password: `Buzeye@2026`
3. Click "Sign In"

---

## 🐛 Troubleshooting

### Still "Login failed"?

**Check backend logs:**
```bash
docker logs crm_backend --tail 50
```

Look for errors like:
- Database connection errors
- Authentication errors
- CORS errors

**Check if backend is running:**
```bash
docker-compose ps
```

Backend should show "Up" status.

**Restart backend:**
```bash
docker-compose restart backend
```

### Backend not connecting to database?

**Check database is running:**
```bash
docker exec crm_database pg_isready -U crm_user
```

**Check database connection from backend:**
```bash
docker exec crm_backend nc -zv database 5432
```

### CORS/HTTPS errors in console?

These are warnings about mixed content (HTTP/HTTPS). They shouldn't prevent login, but if they do:

1. Make sure frontend is accessing backend via HTTP (not HTTPS)
2. Check `VITE_API_URL` in docker-compose.yml uses `http://` not `https://`

---

## 🔍 Debug: Check What's in Database

```bash
# See all users
docker exec -i crm_database psql -U crm_user -d crm_database -c "SELECT * FROM users;"

# Count users
docker exec -i crm_database psql -U crm_user -d crm_database -c "SELECT COUNT(*) FROM users;"

# Check tables exist
docker exec -i crm_database psql -U crm_user -d crm_database -c "\dt"
```

---

## 🆘 Nuclear Option: Recreate Everything

If nothing works, recreate the database:

```bash
# WARNING: This deletes ALL data!
docker-compose down -v
docker-compose up -d

# Wait for database to initialize
sleep 15

# Create admin
docker exec -i crm_database psql -U crm_user -d crm_database <<'EOF'
INSERT INTO users (email, password, full_name, role)
VALUES (
    'admin@buzeye.com',
    '$2a$10$5XAS7tIOlsDVD3/hfg73j.4oR.p5iMqpPdJu9/Pdj/MUIT2EnDBXW',
    'Buzeye Admin',
    'admin'
);
EOF
```

---

## 📋 Summary

**The most likely issue:** Admin user doesn't exist in database yet.

**Quick fix:** Run the SQL INSERT command above.

**Test:** Try logging in again with admin@buzeye.com / Buzeye@2026

---

*If you're still having issues after this, share the backend logs!*
