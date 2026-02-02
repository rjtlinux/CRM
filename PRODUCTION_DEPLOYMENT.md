# Production Deployment Guide

## Quick Start (For Existing EC2)

Your server: **43.204.98.56** (from earlier setup)

### ⚡ Fast Deployment (5 minutes)

```bash
# 1. SSH into your server
ssh -i your-key.pem ubuntu@43.204.98.56

# 2. Navigate to CRM directory
cd ~/CRM

# 3. Pull latest code
git pull origin main

# 4. Apply ALL database migrations
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_customer_sector.sql
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_customer_fields_v2.sql
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_opportunity_workflow.sql

# 5. Restart services
docker-compose restart backend
docker-compose restart frontend

# 6. Test
curl http://43.204.98.56:5000/health
```

**Access:** http://43.204.98.56:5173

---

## 📋 Detailed Step-by-Step Guide

### Step 1: Commit and Push Your Code

**On your local machine:**

```bash
# Go to your CRM directory
cd /Users/optimal/CRM

# Check what changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Add ticket system, customer fields, and workflow features"

# Push to GitHub
git push origin main
```

---

### Step 2: SSH into Production Server

```bash
# Replace with your actual key file path
ssh -i ~/.ssh/your-ec2-key.pem ubuntu@43.204.98.56

# If you're using ec2-user instead:
# ssh -i ~/.ssh/your-ec2-key.pem ec2-user@43.204.98.56
```

---

### Step 3: Navigate to Application Directory

```bash
# Find your CRM directory
cd ~/CRM

# Or if it's elsewhere:
# cd /home/ubuntu/CRM
# cd /var/www/CRM

# Verify you're in the right place
ls -la
# Should see: docker-compose.yml, backend/, frontend/, database/, etc.
```

---

### Step 4: Pull Latest Code from GitHub

```bash
# Pull latest changes
git pull origin main

# You should see messages like:
# Updating abc123..def456
# Fast-forward
# database/add_customer_fields_v2.sql | 38 ++++++++
# database/add_opportunity_workflow.sql | 67 ++++++++
# etc...
```

---

### Step 5: Check Docker Services Status

```bash
# Check if containers are running
docker-compose ps

# Should show:
# NAME                COMMAND              SERVICE    STATUS
# crm_database        "docker-entrypoint..."  database   Up
# crm_backend         "docker-entrypoint..."  backend    Up
# crm_frontend        "docker-entrypoint..."  frontend   Up

# If not running, start them:
docker-compose up -d
```

---

### Step 6: Apply Database Migrations (IMPORTANT!)

Apply all three migrations in order:

#### Migration 1: Customer Sector Field

```bash
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_customer_sector.sql
```

**Expected output:**
```
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
UPDATE 1
UPDATE 0
UPDATE 0
UPDATE 0
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
```

#### Migration 2: Customer Additional Fields

```bash
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_customer_fields_v2.sql
```

**Expected output:**
```
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
UPDATE 0
UPDATE 0
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
```

#### Migration 3: Opportunity Workflow System

```bash
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_opportunity_workflow.sql
```

**Expected output:**
```
ALTER TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
COMMENT
...
INSERT 0 4
```

---

### Step 7: Verify Database Changes

```bash
# Check customers table has new columns
docker-compose exec database psql -U crm_user -d crm_database -c "\d customers"

# Should show columns including:
# - sector
# - business_type
# - generation_mode
# - contact_designation
# - pincode
# - company_size

# Check opportunities table
docker-compose exec database psql -U crm_user -d crm_database -c "\d opportunities"

# Should show:
# - priority
# - next_followup_date
# - last_contact_date
# - tags
# - notes

# Check new tables exist
docker-compose exec database psql -U crm_user -d crm_database -c "\dt"

# Should show:
# - opportunity_activities
# - opportunity_comments
# - opportunity_attachments
```

---

### Step 8: Restart Backend (Apply Code Changes)

```bash
docker-compose restart backend

# Wait for restart
sleep 10

# Check backend logs
docker-compose logs backend --tail=50

# Should show:
# "Server running on port 5000"
# No errors
```

---

### Step 9: Restart Frontend (Apply UI Changes)

```bash
docker-compose restart frontend

# Wait for restart
sleep 10

# Check frontend logs
docker-compose logs frontend --tail=20

# Should show:
# "VITE v5.4.21 ready in XXX ms"
# "➜  Local:   http://localhost:5173/"
# "➜  Network: http://172.x.x.x:5173/"
```

---

### Step 10: Verify Services Are Running

```bash
# Check all containers status
docker-compose ps

# All should show "Up"

# Check backend health
curl http://localhost:5000/health

# Should return:
# {"status":"OK","message":"CRM API is running"}

# Check frontend (should return HTML)
curl http://localhost:5173

# Check from outside (your production URL)
curl http://43.204.98.56:5000/health
```

---

### Step 11: Test the Application

**From your browser:**

1. **Open:** http://43.204.98.56:5173
2. **Login** with your credentials
3. **Test new features:**

#### Test Customer Fields:
```
- Go to Customers
- Click "+ Add Customer"
- Verify new fields appear:
  ✓ Business Type dropdown
  ✓ Generation Mode dropdown
  ✓ Contact Designation input
  ✓ Pincode input
  ✓ Company Size dropdown
- Fill and submit
- Verify customer created
```

#### Test Opportunity Ticket System:
```
- Go to Opportunities
- Click any opportunity card
- Verify ticket view opens
- Check 3 tabs work (Overview, Activity, Comments)
- Try quick actions (Call, Email, Meeting)
- Add a comment
- Edit and change stage
- Check activity timeline
- Close and return
```

#### Test Inline Customer Creation:
```
- Go to Opportunities
- Click "+ Add Opportunity"
- Click "+ Create New Customer"
- Fill all fields (including new ones)
- Submit
- Verify customer created and selected
- Complete opportunity form
- Submit
```

---

## 🔒 Security Checklist

### Before Going Live:

#### 1. **Change Default Credentials**

```bash
# Access database
docker-compose exec database psql -U crm_user -d crm_database

# Change admin password
# Generate new hash at: https://bcrypt-generator.com/
UPDATE users 
SET password = '$2a$10$NEW_HASH_HERE' 
WHERE email = 'admin@crm.com';

\q
```

#### 2. **Set Strong JWT Secret**

```bash
# Edit docker-compose.yml or create .env file
nano docker-compose.yml

# Find JWT_SECRET and change to strong random string
# Generate at: https://www.random.org/strings/
JWT_SECRET: "YOUR_STRONG_RANDOM_SECRET_HERE_AT_LEAST_32_CHARS"

# Restart backend
docker-compose restart backend
```

#### 3. **Set Strong Database Password**

```bash
# Edit docker-compose.yml
nano docker-compose.yml

# Change these:
POSTGRES_PASSWORD: "your_strong_password_here"
DB_PASSWORD: "your_strong_password_here"

# IMPORTANT: If changing after initial setup, need to recreate DB
# Skip this if data exists, or backup first
```

#### 4. **Setup Firewall Rules**

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 5173  # Frontend
sudo ufw allow 5000  # Backend API
sudo ufw enable

# Check status
sudo ufw status
```

#### 5. **Configure CORS Properly**

For production, update backend CORS settings:

```bash
# Edit backend/server.js via your local code
# Change from:
origin: '*'

# To:
origin: ['http://43.204.98.56:5173', 'https://yourdomain.com']

# Then commit, push, pull, restart
```

---

## 🌐 Domain Setup (Optional but Recommended)

### If you have a domain name:

#### 1. **Point Domain to EC2**

In your domain registrar (GoDaddy, Namecheap, etc.):
```
Type: A Record
Name: @ (or crm)
Value: 43.204.98.56
TTL: 3600
```

#### 2. **Install Nginx (Reverse Proxy)**

```bash
# Install Nginx
sudo apt update
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/crm

# Add this config:
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 3. **Setup SSL (HTTPS)**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (should be automatic, but verify)
sudo certbot renew --dry-run
```

**Access:** https://your-domain.com

---

## 🔄 Update Frontend Environment

If using a domain, update frontend API URL:

```bash
# Edit docker-compose.yml
nano docker-compose.yml

# Change frontend environment:
services:
  frontend:
    environment:
      VITE_API_URL: https://your-domain.com/api  # or http://43.204.98.56:5000/api

# Restart
docker-compose restart frontend
```

---

## 📊 Monitoring & Logs

### View Logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database

# Last 100 lines
docker-compose logs --tail=100 backend

# Follow new logs
docker-compose logs -f --tail=50
```

### Check Resource Usage:

```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory usage
free -h

# Check running processes
top
```

---

## 🔧 Troubleshooting

### Problem: "Cannot connect to database"

```bash
# Check database is running
docker-compose ps database

# Restart database
docker-compose restart database

# Check logs
docker-compose logs database --tail=50

# If container keeps restarting, check permissions
docker-compose logs database | grep -i error
```

### Problem: "500 Internal Server Error"

```bash
# Check backend logs
docker-compose logs backend --tail=100

# Look for errors
docker-compose logs backend | grep -i error

# Restart backend
docker-compose restart backend
```

### Problem: "Migrations already applied" error

```bash
# This is OK! It means that migration was already run.
# Skip migrations that give this error.

# To check what's applied:
docker-compose exec database psql -U crm_user -d crm_database -c "\d customers"
```

### Problem: Frontend not loading

```bash
# Check if frontend is running
docker-compose ps frontend

# Check frontend logs
docker-compose logs frontend --tail=50

# Restart frontend
docker-compose restart frontend

# Check if port 5173 is accessible
curl http://localhost:5173
```

### Problem: "CORS error" in browser

```bash
# Update backend CORS settings
# Edit backend/server.js to include your IP/domain

# Or temporarily allow all (not recommended for production)
# In backend/server.js:
origin: '*'

# Restart backend
docker-compose restart backend
```

---

## 💾 Backup Strategy

### Database Backup:

```bash
# Create backup directory
mkdir -p ~/backups

# Backup database
docker-compose exec database pg_dump -U crm_user crm_database > ~/backups/crm_backup_$(date +%Y%m%d).sql

# Restore from backup (if needed)
docker-compose exec -T database psql -U crm_user -d crm_database < ~/backups/crm_backup_20260202.sql
```

### Automated Daily Backups:

```bash
# Create backup script
nano ~/backup_crm.sh
```

```bash
#!/bin/bash
# CRM Backup Script

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/crm_backup_$DATE.sql"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Backup database
cd ~/CRM
docker-compose exec -T database pg_dump -U crm_user crm_database > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "crm_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

```bash
# Make executable
chmod +x ~/backup_crm.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/ubuntu/backup_crm.sh >> /home/ubuntu/backup.log 2>&1
```

---

## 🚀 Performance Optimization

### For Production:

#### 1. **Build Frontend for Production**

```bash
# On local machine
cd frontend
npm run build

# Or update Dockerfile to use production build
```

#### 2. **Enable Gzip Compression**

In Nginx config:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

#### 3. **Database Connection Pooling**

Already configured in `backend/config/database.js`:
```javascript
max: 20,  // Maximum connections
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 2000,
```

#### 4. **Add Database Indexes**

Already included in migrations, but verify:
```sql
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_customers_sector ON customers(sector);
```

---

## 📱 Quick Commands Reference

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart backend

# View logs
docker-compose logs -f backend

# Check status
docker-compose ps

# Pull latest code
git pull origin main

# Apply migration
docker-compose exec -T database psql -U crm_user -d crm_database < database/migration.sql

# Backup database
docker-compose exec database pg_dump -U crm_user crm_database > backup.sql

# Access database CLI
docker-compose exec database psql -U crm_user -d crm_database

# Check backend health
curl http://localhost:5000/health

# Full restart (after code changes)
git pull && docker-compose restart backend && docker-compose restart frontend
```

---

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] Application loads at http://43.204.98.56:5173
- [ ] Login works
- [ ] Dashboard displays correctly
- [ ] All new customer fields appear
- [ ] Opportunity ticket view works
- [ ] Can create customers with new fields
- [ ] Can create opportunities
- [ ] Ticket system shows activity timeline
- [ ] Comments work
- [ ] Quick actions log activities
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Database migrations applied successfully
- [ ] All three migrations show in database schema

---

## 🆘 Need Help?

### Check Logs:
```bash
# Backend errors
docker-compose logs backend | grep -i error

# Frontend errors
docker-compose logs frontend | grep -i error

# Database errors
docker-compose logs database | grep -i error
```

### Common Issues:
1. **Port already in use** - Stop conflicting service or change port
2. **Permission denied** - Use `sudo` or check file permissions
3. **Database connection failed** - Check credentials in docker-compose.yml
4. **Migration failed** - Check if already applied, verify syntax

---

## 📞 Support

If you encounter issues:
1. Check logs first
2. Verify all migrations applied
3. Ensure services are running
4. Test database connection
5. Check firewall/security groups

---

**Version:** Production v2.0  
**Date:** February 2, 2026  
**Status:** Production Ready

🚀 **Your CRM is now ready for production deployment!**
