# Buzeye CRM - Troubleshooting Guide

## Common Issues & Fixes

### 1. Dashboard Shows No Data (But Database Has Records)

**Symptoms:**
- Login successful
- Dashboard is empty or shows zeros
- Database actually contains data

**Root Cause:**
- Frontend container running old/stale code
- Backend updated but frontend not rebuilt

**Diagnosis:**
```bash
# Check container uptimes
sudo docker ps | grep <slug>
```
Look for "Up X weeks/days" - if frontend is much older than backend, it needs rebuild

**Solution:**
```bash
cd /home/ubuntu/CRM/tenants/<slug>
sudo docker-compose up -d --build frontend
sudo docker logs crm_<slug>_frontend --tail 20  # Verify it started
```

**Prevention:**
- Always rebuild both frontend and backend when making API changes
- Document rebuild in deployment notes

---

### 2. Missing Database Tables

**Symptoms:**
- Error: `relation "udhar_khata_entries" does not exist`
- Features not working that rely on specific tables

**Root Cause:**
- Older tenants provisioned before schema updates
- Migration not applied to existing tenant

**Diagnosis:**
```bash
# List all tables
sudo docker exec crm_<slug>_database psql -U crm_<slug> -d crm_<slug> -c '\dt'
```

**Solution:**
```bash
# Apply specific migration
sudo docker exec -i crm_<slug>_database psql -U crm_<slug> -d crm_<slug> < /path/to/migration.sql

# Example: WhatsApp integration
cd /home/ubuntu/CRM
sudo docker exec -i crm_acme_database psql -U crm_acme -d crm_acme < database/migrations/whatsapp_integration.sql
```

**Note:** Check tenant schema version before implementing features

---

### 3. API Returns "Access denied. No token provided"

**Symptoms:**
- API calls fail with authentication error
- Frontend can't fetch data after login

**Root Cause:**
- Token not stored in localStorage
- Token expired (7 day TTL)
- Authorization header not sent

**Diagnosis:**
```bash
# Test login endpoint
curl -X POST http://localhost:5010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Buz3y3!@Acm3#2026"}'
```

**Solution:**
- Check browser console for localStorage token
- Clear localStorage and re-login
- Verify JWT_SECRET matches in docker-compose.yml

---

### 4. Nginx 502 Bad Gateway

**Symptoms:**
- Can't access tenant subdomain
- Nginx error page shown

**Root Cause:**
- Backend container not running
- Port mismatch in Nginx config

**Diagnosis:**
```bash
# Check containers running
sudo docker ps | grep <slug>

# Check Nginx config
sudo cat /etc/nginx/sites-available/<slug>.buzeye.com.conf

# Test Nginx config
sudo nginx -t
```

**Solution:**
```bash
# Restart affected containers
cd /home/ubuntu/CRM/tenants/<slug>
sudo docker-compose restart backend

# Reload Nginx
sudo systemctl reload nginx
```

---

### 5. Frontend/Backend Container Won't Start

**Symptoms:**
- Container exits immediately after start
- Container in Restarting loop

**Diagnosis:**
```bash
# Check container logs
sudo docker logs crm_<slug>_backend --tail 100
sudo docker logs crm_<slug>_frontend --tail 100

# Check if port already in use
sudo netstat -tulpn | grep <port>
```

**Common Causes:**
- Port already in use
- Missing environment variables
- Syntax error in code
- Database connection failed

**Solution:**
```bash
# Check environment variables
sudo cat /home/ubuntu/CRM/tenants/<slug>/.env

# Rebuild with no cache
cd /home/ubuntu/CRM/tenants/<slug>
sudo docker-compose down
sudo docker-compose build --no-cache
sudo docker-compose up -d
```

---

## Data Verification Commands

### Quick Health Check
```bash
# All counts in one command
sudo docker exec crm_<slug>_database psql -U crm_<slug> -d crm_<slug> -t -c "
SELECT 'customers:' || COUNT(*) FROM customers 
UNION ALL SELECT 'sales:' || COUNT(*) FROM sales 
UNION ALL SELECT 'opportunities:' || COUNT(*) FROM opportunities 
UNION ALL SELECT 'users:' || COUNT(*) FROM users;"
```

### Test Authenticated API
```bash
# Login and test dashboard endpoint
TOKEN=$(curl -s -X POST http://localhost:5010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Buz3y3!@Acm3#2026"}' | \
  grep -o '"token":"[^"]*' | cut -d\" -f4)

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5010/api/dashboard/stats
```

### Check Recent Activity
```bash
# Backend logs from last hour
sudo docker logs crm_<slug>_backend --since 1h

# Recent database queries
sudo docker logs crm_<slug>_database --since 30m
```

---

## Database Schema Differences

### Old Schema (Early Tenants)
- Credit tracking: `sales` table with `payment_method='udhar'`
- No dedicated WhatsApp tables
- Basic GST fields only

### New Schema (Current)
- Credit tracking: Dedicated `udhar_khata_entries` table
- WhatsApp: `whatsapp_config` and `whatsapp_conversations` tables
- Enhanced GST: `gst_invoices`, `gst_invoice_items`, `hsn_sac_codes`, `gst_rates`

**Check Before Implementing Features:**
```bash
sudo docker exec crm_<slug>_database psql -U crm_<slug> -d crm_<slug> -c '\dt' | grep -i udhar
```

---

## Security Notes

### Ignore These Log Entries (Automated Scanners)
```
GET /api/.env
GET /api/phpinfo.php
GET /api/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php
GET /api/info.php
```
These are bot/scanner attempts - all return 404, no security impact.

### Never Log Sensitive Data
When checking .env files:
```bash
# Good - filters passwords
sudo cat /home/ubuntu/CRM/tenants/<slug>/.env | grep -v PASSWORD

# Bad - exposes credentials
sudo cat /home/ubuntu/CRM/tenants/<slug>/.env
```

---

## Critical Business Logic

### Udhar Khata vs Sales
- **Credit transactions**: Use `udhar_khata_entries` table (new) or `sales` with `payment_method='udhar'` (old)
- **Cash sales**: Use `sales` table with `payment_method='cash'`
- **Outstanding calculation**: Sum(debits) - Sum(credits)
- **NEVER** mix these in queries or reports

### AI Customer Matching
- AI **cannot create** new customers (removed by design)
- Uses fuzzy matching with Hindi transliteration
- Suggests similar names if exact match not found
- Implementation: `backend/controllers/aiController.js`

---

## Performance Optimization

### Slow Dashboard Loads
```bash
# Check query performance
sudo docker exec crm_<slug>_database psql -U crm_<slug> -d crm_<slug> -c "
SELECT schemaname, tablename, n_live_tup 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;"

# Check missing indexes
sudo docker exec crm_<slug>_database psql -U crm_<slug> -d crm_<slug> -c "
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';"
```

### Large Log Files
```bash
# Truncate logs without restarting
sudo truncate -s 0 $(docker inspect --format='{{.LogPath}}' crm_<slug>_backend)
```

---

## Emergency Recovery

### Complete Tenant Restart
```bash
cd /home/ubuntu/CRM/tenants/<slug>
sudo docker-compose down
sudo docker-compose up -d
```

### Database Backup
```bash
# Create backup
sudo docker exec crm_<slug>_database pg_dump -U crm_<slug> crm_<slug> > backup_$(date +%Y%m%d).sql

# Restore backup
sudo docker exec -i crm_<slug>_database psql -U crm_<slug> -d crm_<slug> < backup_20260407.sql
```

### Rollback Git Changes
```bash
cd /home/ubuntu/CRM
git log --oneline -10  # Find commit hash
git reset --hard <commit-hash>
# Then rebuild affected services
```

---

## When to Ask for Help

1. **Data corruption** - Contact database admin
2. **SSL certificate issues** - Check Let's Encrypt renewal
3. **Server resource exhaustion** - Check `htop`, `df -h`
4. **Persistent unexplained errors** - Gather logs and create issue

## Support Checklist

Before asking for help, gather:
- [ ] Container status: `sudo docker ps | grep <slug>`
- [ ] Backend logs: Last 100 lines
- [ ] Frontend logs: Last 100 lines
- [ ] Database logs: Last 100 lines
- [ ] Nginx error log: `sudo tail -100 /var/log/nginx/error.log`
- [ ] Steps to reproduce the issue
- [ ] Expected vs actual behavior
