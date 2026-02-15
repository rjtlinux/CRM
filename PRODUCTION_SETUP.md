# 🚀 Buzeye Production Setup Guide

## Current Issue: Wrong Database User

Your error: `FATAL: role "postgres" does not exist`

**Reason:** The database user is `crm_user`, not `postgres`

---

## ✅ Correct Commands for Your Server

### Step 1: Apply Fresh Admin Credentials

```bash
# SSH to your server (if not already)
ssh ubuntu@buzeye.com

# Navigate to project
cd /home/ubuntu/CRM

# Pull latest changes (includes new logo and credentials)
git pull origin main

# Apply admin reset with CORRECT user
docker exec -i crm_database psql -U crm_user -d crm_database < database/reset_admin.sql
```

### Step 2: Restart Services

```bash
# Restart backend and frontend to apply logo changes
docker-compose restart backend frontend

# Wait a few seconds
sleep 5

# Check if services are running
docker-compose ps
```

### Step 3: Test Login

Open in browser: **http://buzeye.com:5173**

**Login with:**
- Email: `admin@buzeye.com`
- Password: `Buzeye@2026`

---

## 🎨 What's New (After Git Pull)

1. **Professional Logo Design**
   - Gradient background with glow effects
   - Card-style presentation (no more "placeholder" look)
   - Appears in sidebar and login page

2. **Fresh Admin Credentials**
   - Email: admin@buzeye.com
   - Password: Buzeye@2026
   - Updated demo credentials on login page

3. **Enhanced Branding**
   - Buzeye name with gradient text effect
   - Blue & gold color theme
   - Professional card layouts

---

## Alternative: Manual Database Entry

If the SQL file doesn't work, enter the database manually:

```bash
# Enter PostgreSQL container
docker exec -it crm_database psql -U crm_user -d crm_database

# Run these SQL commands one by one:
```

```sql
-- Delete old admin accounts
DELETE FROM users WHERE email IN ('admin@buzeye.com', 'admin@crm.com');

-- Create new admin
INSERT INTO users (email, password, full_name, role)
VALUES (
    'admin@buzeye.com',
    '$2a$10$5XAS7tIOlsDVD3/hfg73j.4oR.p5iMqpPdJu9/Pdj/MUIT2EnDBXW',
    'Buzeye Admin',
    'admin'
);

-- Verify it worked
SELECT email, full_name, role FROM users WHERE email = 'admin@buzeye.com';

-- Exit with
\q
```

---

## 🔍 Troubleshooting

### Check if containers are running:
```bash
docker-compose ps
```

**Expected output:**
```
NAME            STATUS          PORTS
crm_database    Up (healthy)    0.0.0.0:5432->5432/tcp
crm_backend     Up              0.0.0.0:5000->5000/tcp
crm_frontend    Up              0.0.0.0:5173->5173/tcp
```

### Check backend logs:
```bash
docker logs crm_backend --tail 50
```

### Check frontend logs:
```bash
docker logs crm_frontend --tail 50
```

### Check database logs:
```bash
docker logs crm_database --tail 50
```

### Verify admin user exists:
```bash
docker exec -it crm_database psql -U crm_user -d crm_database -c "SELECT email, full_name, role FROM users WHERE email='admin@buzeye.com';"
```

---

## 🌐 Port Configuration

Your server uses these ports:
- **Frontend:** http://buzeye.com:5173
- **Backend API:** http://buzeye.com:5000
- **Database:** Port 5432 (internal only)

### Optional: Remove Port from URL

If you want `http://buzeye.com` instead of `http://buzeye.com:5173`:

**Option 1: Nginx Reverse Proxy** (Recommended)
```nginx
server {
    listen 80;
    server_name buzeye.com www.buzeye.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

**Option 2: Change Docker Ports**
Edit `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "80:5173"  # Change from 5173:5173
```

---

## 📋 Quick Reference

### Database Connection Details
```
Host: database (internal) / localhost:5432 (external)
Database: crm_database
User: crm_user
Password: crm_password
```

### Admin Credentials
```
Email: admin@buzeye.com
Password: Buzeye@2026
```

### Useful Commands
```bash
# View all containers
docker-compose ps

# Restart all services
docker-compose restart

# View backend logs
docker logs crm_backend -f

# View frontend logs
docker logs crm_frontend -f

# Stop everything
docker-compose down

# Start everything fresh
docker-compose up -d

# Rebuild and start
docker-compose up -d --build
```

---

## 🔐 Security Recommendations

1. **Change default database password** in `docker-compose.yml`:
   ```yaml
   POSTGRES_PASSWORD: YOUR_SECURE_PASSWORD_HERE
   ```

2. **Change JWT secret** in backend environment:
   ```yaml
   JWT_SECRET: YOUR_SECURE_JWT_SECRET_HERE
   ```

3. **Set up SSL/HTTPS** using Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d buzeye.com -d www.buzeye.com
   ```

4. **Enable firewall**:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

---

## 📞 Support

If you're still having issues:

1. Check that all containers are running: `docker-compose ps`
2. Check logs for errors: `docker logs <container_name>`
3. Verify database user: The user is `crm_user`, not `postgres`
4. Ensure git pull was successful: `git status`

---

*Production setup guide for Buzeye CRM*  
*Server: buzeye.com*  
*Updated: January 13, 2026*
