# Buzeye CRM - Tenant Onboarding Guide

**Complete guide for provisioning and configuring new tenants with all features including WhatsApp integration**

Last Updated: April 14, 2026  
Version: 2.0 (Multi-Tenant with Plan-Based Access)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: Tenant Provisioning](#part-1-tenant-provisioning)
4. [Part 2: DNS & SSL Configuration](#part-2-dns--ssl-configuration)
5. [Part 3: Environment Variables](#part-3-environment-variables)
6. [Part 4: WhatsApp API Integration](#part-4-whatsapp-api-integration)
7. [Part 5: Verification & Testing](#part-5-verification--testing)
8. [Part 6: Admin Access & Initial Setup](#part-6-admin-access--initial-setup)
9. [Troubleshooting](#troubleshooting)
10. [Appendix](#appendix)

---

## Overview

### What This Guide Covers

This guide walks through the complete process of onboarding a new tenant to the Buzeye CRM multi-tenant platform. By the end, you'll have:

- ✅ Fully provisioned tenant with isolated database and containers
- ✅ DNS records and SSL certificates configured
- ✅ All environment variables properly set
- ✅ WhatsApp API integrated (Enterprise plan only)
- ✅ Plan-based access control active
- ✅ Admin user created and accessible

### Multi-Tenant Architecture

Each tenant gets:
- **Isolated PostgreSQL database** (crm_<slug>)
- **Dedicated Docker containers** (frontend, backend, database)
- **Unique ports** (auto-assigned by provisioning script)
- **Subdomain** (<slug>.buzeye.com)
- **Plan assignment** (Starter, Professional, or Enterprise)

### Plan Tiers

| Plan | Price | Customers | Users | AI Voice | WhatsApp | API Access |
|------|-------|-----------|-------|----------|----------|------------|
| **Starter** | ₹999/mo | 500 | 2 | ❌ | ❌ | ❌ |
| **Professional** | ₹2,499/mo | Unlimited | 5 | ✅ | ✅ | ❌ |
| **Enterprise** | Custom | Unlimited | Unlimited | ✅ | ✅ | ✅ |

---

## Prerequisites

### Server Requirements

- Ubuntu Server 20.04+ (Production: AWS EC2 t3a.medium or higher)
- Docker & Docker Compose installed
- Nginx installed and running
- SSL certificate tool (Certbot) installed
- SSH access to the server

### Access Requirements

- Root or sudo access on the server
- DNS management access for buzeye.com domain
- OpenAI API key (for AI features)
- Meta Developer account (for WhatsApp integration, Enterprise only)
- Server IP address (Production: 35.154.11.108)

### File Locations

```
/home/ubuntu/CRM/                    # Main repository
├── scripts/provision-tenant.sh       # Provisioning script
├── tenants/                          # All tenant directories
│   ├── registry.json                 # Tenant registry
│   ├── <slug>/                       # Individual tenant folder
│   │   ├── docker-compose.yml        # Tenant's Docker config
│   │   ├── nginx.conf                # Tenant's Nginx config
│   │   └── .env                      # Tenant environment variables
├── backend/                          # Shared backend code
├── frontend/                         # Shared frontend code
└── database/                         # Schema and migrations
```

---

## Part 1: Tenant Provisioning

### Step 1.1: Prepare Tenant Information

Before provisioning, gather the following information:

```bash
SLUG="as"                              # Subdomain identifier (lowercase, no spaces)
COMPANY_NAME="AS Enterprises"          # Full company name
ADMIN_EMAIL="admin@as.com"             # Admin user email
ADMIN_NAME="Admin"                     # Admin user name
PLAN="enterprise"                      # starter, professional, or enterprise
ADMIN_PASSWORD="Sorav1900"             # Initial admin password
```

**Naming Conventions:**
- **SLUG**: Short, lowercase, alphanumeric (e.g., "as", "dev", "acme")
- **Company Name**: Full legal or trading name
- **Plan**: Must be one of: `starter`, `professional`, `enterprise`

### Step 1.2: Run Provisioning Script

SSH into the production server:

```bash
ssh -i ~/path/to/crm.pem ubuntu@35.154.11.108
cd /home/ubuntu/CRM
```

Execute the provisioning script:

```bash
sudo bash scripts/provision-tenant.sh <slug> "<company_name>" <admin_email> "<admin_name>" <plan> <password>
```

**Example:**

```bash
sudo bash scripts/provision-tenant.sh as "AS Enterprises" admin@as.com "Admin" enterprise Sorav1900
```

### Step 1.3: Verify Provisioning

The script will:
1. ✅ Create tenant directory structure
2. ✅ Generate .env file with secure random DB password
3. ✅ Create docker-compose.yml with correct ports
4. ✅ Build Docker images (backend and frontend)
5. ✅ Start PostgreSQL database container
6. ✅ Run schema migrations (8 SQL scripts)
7. ✅ Create admin user with hashed password
8. ✅ Register tenant in master database with plan configuration
9. ✅ Start backend and frontend containers
10. ✅ Generate Nginx configuration template

**Success Output:**

```
==========================================
Tenant provisioned: as
==========================================

URL: http://as.buzeye.com (add DNS + Nginx)
Direct: http://172.31.1.173:5180

Plan: enterprise
Admin: admin@as.com
Password: Sorav1900

NEXT STEPS:
1. DNS: as.buzeye.com → your server IP
2. Nginx: Include config from /home/ubuntu/CRM/tenants/as/nginx.conf
3. SSL: certbot --nginx -d as.buzeye.com

==========================================
```

### Step 1.4: Check Container Status

Verify all containers are running:

```bash
sudo docker ps | grep crm_as
```

**Expected output:**

```
crm_as_frontend    Up    0.0.0.0:5180->5173/tcp
crm_as_backend     Up    0.0.0.0:5010->5000/tcp
crm_as_database    Up    0.0.0.0:5433->5432/tcp (healthy)
```

**Troubleshooting:** If backend is restarting, check logs:

```bash
sudo docker logs --tail 50 crm_as_backend
```

Common issue: Missing environment variables (see Part 3).

---

## Part 2: DNS & SSL Configuration

### Step 2.1: Create DNS A Record

In your DNS management console (AWS Route 53, Cloudflare, etc.):

**Record Type:** A Record  
**Name:** `as` (or full name `as.buzeye.com`)  
**Value:** `35.154.11.108` (server IP)  
**TTL:** 300 (5 minutes) or Auto

**Verification:**

```bash
# Wait 1-5 minutes after creating DNS record
dig as.buzeye.com +short
# Should return: 35.154.11.108
```

### Step 2.2: Update Nginx Configuration

The provisioning script generates an Nginx config at:  
`/home/ubuntu/CRM/tenants/as/nginx.conf`

This config has already been added to `/etc/nginx/sites-available/buzeye-tenants.conf`.

**Verify Nginx syntax:**

```bash
sudo nginx -t
```

**Reload Nginx:**

```bash
sudo systemctl reload nginx
```

### Step 2.3: Obtain SSL Certificate

Once DNS is propagated, request SSL certificate:

```bash
sudo certbot --nginx -d as.buzeye.com --non-interactive --agree-tos --email admin@as.com
```

**Expected output:**

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/as.buzeye.com/fullchain.pem
Key is saved at: /etc/letsencrypt/live/as.buzeye.com/privkey.pem
This certificate expires on 2026-07-13.
Congratulations! You have successfully enabled HTTPS on https://as.buzeye.com
```

**Verification:**

```bash
curl -I https://as.buzeye.com
# Should return: HTTP/2 200
```

**Troubleshooting:**

If certbot fails with "DNS problem: NXDOMAIN":
- DNS record not yet propagated (wait 5-10 minutes)
- Check DNS with: `dig as.buzeye.com`
- Verify DNS shows correct server IP

---

## Part 3: Environment Variables

### Step 3.1: Current Environment Variables

The provisioning script creates `/home/ubuntu/CRM/tenants/<slug>/.env` with basic variables:

```bash
SLUG=as
COMPANY_NAME=AS Enterprises
ADMIN_EMAIL=admin@as.com
ADMIN_PASSWORD=Sorav1900
FRONTEND_PORT=5180
BACKEND_PORT=5010
DB_PORT=5433
DB_NAME=crm_as
DB_USER=crm_as
DB_PASSWORD=BdunwwQabyyd92tHKL3b  # Auto-generated secure password
```

### Step 3.2: Required Additional Variables

The backend requires additional environment variables that must be added to the `docker-compose.yml` file:

```bash
cd /home/ubuntu/CRM/tenants/as
sudo nano docker-compose.yml
```

Add these environment variables to the **backend service**:

```yaml
backend:
  environment:
    # ... existing variables ...
    
    # OpenAI Configuration (REQUIRED for AI features)
    OPENAI_API_KEY: "sk-proj-xxxxxxxxxxxxxxxxxxxx"
    
    # WhatsApp Configuration (Enterprise Plan only)
    WHATSAPP_PHONE_NUMBER_ID: ""
    WHATSAPP_ACCESS_TOKEN: ""
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: ""
    WHATSAPP_BUSINESS_ACCOUNT_ID: ""
    
    # Master Database (already configured)
    MASTER_DB_HOST: crm_database
    MASTER_DB_PORT: 5432
    MASTER_DB_NAME: crm_master
    MASTER_DB_USER: crm_user
    MASTER_DB_PASSWORD: CRMSecure2026
```

### Step 3.3: OpenAI API Key Configuration

**Where to get:**
1. Create account at [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys section
3. Create new secret key
4. Copy key (starts with `sk-proj-` or `sk-`)

**Add to docker-compose.yml:**

```yaml
OPENAI_API_KEY: "sk-proj-your-actual-key-here"
```

**⚠️ Security Note:**
- Never commit API keys to git
- Use environment-specific keys (dev vs production)
- Monitor usage in OpenAI dashboard
- Set spending limits

### Step 3.4: Restart Backend Container

After updating environment variables:

```bash
cd /home/ubuntu/CRM/tenants/as
sudo docker-compose restart backend
```

**Verify backend is running:**

```bash
sudo docker ps | grep crm_as_backend
# Should show: Up X seconds (not Restarting)
```

**Check logs for errors:**

```bash
sudo docker logs --tail 20 crm_as_backend
# Should show: [Server] CRM Backend running on port 5000
# Should NOT show: OpenAIError or missing environment variable
```

---

## Part 4: WhatsApp API Integration

**⚠️ Enterprise Plan Only**: WhatsApp integration is available only on Enterprise plan.

### Step 4.1: Meta Developer Account Setup

1. **Create Meta Developer App**
   - Go to [developers.facebook.com](https://developers.facebook.com)
   - Click "Create App"
   - Choose "Business" type
   - Fill in app details

2. **Add WhatsApp Product**
   - In app dashboard, click "Add Product"
   - Select "WhatsApp" → "Set Up"

3. **Get Temporary Access Token**
   - In WhatsApp → API Setup
   - Copy "Temporary access token" (valid 24 hours)

4. **Note Phone Number ID**
   - In WhatsApp → API Setup
   - Copy "Phone number ID"

### Step 4.2: Webhook Configuration

**Webhook URL Format:**
```
https://as.buzeye.com/api/whatsapp/webhook
```

1. **Generate Verify Token** (random string):
   ```bash
   openssl rand -base64 32
   # Example: "vQx8u2K9mLp4nR7wY1eT5aZ3..."
   ```

2. **Configure in Meta Dashboard**:
   - WhatsApp → Configuration → Webhook
   - Callback URL: `https://as.buzeye.com/api/whatsapp/webhook`
   - Verify Token: (paste the generated token above)
   - Click "Verify and Save"

3. **Subscribe to Webhooks**:
   - In Webhook Fields, subscribe to:
     - ✅ messages
     - ✅ message_status (optional)

### Step 4.3: Production API Setup

**Required for production (after testing):**

1. **Get Permanent Access Token**
   - Meta Business Manager → System Users
   - Create system user with "WhatsApp Business Management" permission
   - Generate permanent token

2. **Add Phone Number**
   - Purchase phone number from Meta or
   - Register existing business phone

3. **Complete Business Verification**
   - Required for sending messages to any number
   - Meta Business Verification process (1-2 weeks)

### Step 4.4: Update Environment Variables

Edit docker-compose.yml:

```yaml
backend:
  environment:
    # WhatsApp Configuration
    WHATSAPP_PHONE_NUMBER_ID: "123456789012345"  # From Meta dashboard
    WHATSAPP_ACCESS_TOKEN: "EAAxxxxxxxxxxxxxxxx"  # Permanent token
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "vQx8u2K9mLp4nR7wY1eT5aZ3..."  # Your generated token
    WHATSAPP_BUSINESS_ACCOUNT_ID: "987654321098765"  # From Meta dashboard
```

**Restart backend:**

```bash
sudo docker-compose restart backend
```

### Step 4.5: Database Configuration

Store WhatsApp configuration in database:

```bash
# Connect to tenant database
sudo docker exec -it crm_as_database psql -U crm_as -d crm_as
```

```sql
-- Insert WhatsApp configuration
INSERT INTO whatsapp_config (
    phone_number_id,
    access_token,
    webhook_verify_token,
    business_account_id,
    webhook_url,
    is_active
) VALUES (
    '123456789012345',  -- phone_number_id
    'EAAxxxxxxxxxxxxxxxx',  -- access_token
    'vQx8u2K9mLp4nR7wY1eT5aZ3...',  -- webhook_verify_token
    '987654321098765',  -- business_account_id
    'https://as.buzeye.com/api/whatsapp/webhook',
    true
);

-- Verify
SELECT * FROM whatsapp_config;
```

Exit psql: `\q`

### Step 4.6: Test WhatsApp Integration

**Test webhook verification:**

```bash
curl -X GET "https://as.buzeye.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
# Should return: test123
```

**Send test message from WhatsApp:**

1. Add test number to WhatsApp test account (Meta dashboard)
2. Send message to your WhatsApp business number
3. Check backend logs for incoming webhook
4. Check if AI response was sent

**Check logs:**

```bash
sudo docker logs -f crm_as_backend | grep -i whatsapp
```

Expected output:
```
[WhatsApp] Received message from: +91xxxxxxxxxx
[WhatsApp] AI response: "Hello! How can I help you?"
[WhatsApp] Message sent successfully
```

### Step 4.7: Verify Database Persistence

```bash
sudo docker exec -it crm_as_database psql -U crm_as -d crm_as
```

```sql
-- Check conversations
SELECT wa_phone, last_message_at, incoming_count, outgoing_count 
FROM whatsapp_conversations 
ORDER BY last_message_at DESC 
LIMIT 10;

-- View recent messages
SELECT * FROM whatsapp_conversations 
ORDER BY last_message_at DESC 
LIMIT 1;
```

---

## Part 5: Verification & Testing

### Step 5.1: Service Health Check

```bash
# Check all containers
sudo docker ps | grep crm_as

# Check backend logs
sudo docker logs --tail 50 crm_as_backend

# Check frontend logs
sudo docker logs --tail 50 crm_as_frontend

# Check database health
sudo docker exec crm_as_database pg_isready -U crm_as -d crm_as
```

### Step 5.2: API Endpoint Testing

**Test backend health:**

```bash
curl https://as.buzeye.com/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

**Test authentication:**

```bash
curl -X POST https://as.buzeye.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@as.com",
    "password": "Sorav1900"
  }'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "admin@as.com",
    "name": "Admin",
    "role": "admin"
  }
}
```

### Step 5.3: Plan Configuration Verification

```bash
# Connect to master database
sudo docker exec -it crm_database psql -U crm_user -d crm_master
```

```sql
-- Verify tenant registration
SELECT slug, company_name, plan, status, created_at 
FROM tenants 
WHERE slug = 'as';

-- Check plan limits
SELECT plan_limits FROM tenants WHERE slug = 'as';

-- Expected output for Enterprise:
-- {"users": -1, "customers": -1, "ai_requests": -1, "storage_gb": -1}
-- (-1 means unlimited)
```

### Step 5.4: Feature Access Testing

**Test plan-based features:**

```bash
# Test AI endpoint (with auth token from login)
curl -X POST https://as.buzeye.com/api/ai/chat \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "language": "en"}'
```

**For Enterprise plan, should return AI response.  
For Starter plan, should return 403 with upgrade message.**

### Step 5.5: Frontend Access

1. Open browser: `https://as.buzeye.com`
2. Should load login page (no CORS errors)
3. Login with admin credentials
4. Dashboard should load with plan usage widget
5. Check plan badge shows "Enterprise"

**Verify plan features in UI:**
- ✅ AI chatbot visible (bottom right)
- ✅ Voice input button visible
- ✅ All menu items accessible
- ✅ Plan usage widget shows "Unlimited ✓" for all metrics

---

## Part 6: Admin Access & Initial Setup

### Step 6.1: First Login

**Access URL:** `https://as.buzeye.com`

**Admin Credentials:**
- Email: `admin@as.com`
- Password: `Sorav1900`

**⚠️ Security Recommendation:**
Change admin password immediately after first login.

### Step 6.2: Initial Configuration

1. **Update Company Profile**
   - Navigate to Settings → Company
   - Add company logo
   - Update contact details
   - Set GST number (if applicable)

2. **Add Additional Users** (based on plan limits)
   - Settings → Users → Add User
   - Assign roles: Admin, Sales, Manager
   - Set permissions

3. **Configure GST Settings** (if applicable)
   - Settings → GST Configuration
   - Enter GSTIN
   - Configure tax rates
   - Set invoice prefix

4. **Import Customer Data** (optional)
   - Customers → Import
   - Upload CSV file
   - Map fields
   - Review and confirm

### Step 6.3: AI Assistant Configuration

**Enable AI features:**

1. Verify OpenAI key is working:
   - Click AI chatbot icon (bottom right)
   - Type: "Hello"
   - Should get AI response

2. **Test voice input:**
   - Click microphone icon
   - Allow browser microphone permission
   - Speak: "Record sale 1000 rupees from Amit"
   - Should transcribe and process command

3. **Configure AI behavior** (optional):
   - Settings → AI Configuration
   - Set default language (Hindi/English)
   - Configure business context
   - Set custom instructions

### Step 6.4: WhatsApp Setup Verification

**For Enterprise plan with WhatsApp enabled:**

1. **Test WhatsApp number:**
   - Add your mobile to test recipients (Meta dashboard)
   - Send test message to business WhatsApp
   - Should receive AI-powered response

2. **View conversations:**
   - Navigate to WhatsApp → Conversations (if UI available)
   - Or check database:
     ```bash
     sudo docker exec -it crm_as_database psql -U crm_as -d crm_as
     ```
     ```sql
     SELECT * FROM whatsapp_conversations ORDER BY last_message_at DESC LIMIT 5;
     ```

3. **Monitor logs:**
   ```bash
   sudo docker logs -f crm_as_backend | grep WhatsApp
   ```

---

## Troubleshooting

### Backend Container Keeps Restarting

**Symptom:** `docker ps` shows backend status as "Restarting"

**Check logs:**
```bash
sudo docker logs --tail 50 crm_as_backend
```

**Common causes:**

1. **Missing OPENAI_API_KEY:**
   ```
   Error: OpenAIError: The OPENAI_API_KEY environment variable is missing
   ```
   **Fix:** Add OpenAI key to docker-compose.yml (see Part 3.3)

2. **Database connection failed:**
   ```
   Error: connect ECONNREFUSED database:5432
   ```
   **Fix:** Check database container is healthy
   ```bash
   sudo docker ps | grep crm_as_database
   # Should show (healthy)
   ```

3. **Missing Node modules:**
   ```
   Error: Cannot find module 'helmet'
   ```
   **Fix:** Rebuild backend image
   ```bash
   cd /home/ubuntu/CRM/tenants/as
   sudo docker-compose up -d --build backend
   ```

### SSL Certificate Failed

**Symptom:**
```
Certbot failed to authenticate some domains
Type: dns
Detail: NXDOMAIN looking up A for as.buzeye.com
```

**Fixes:**

1. **Verify DNS propagation:**
   ```bash
   dig as.buzeye.com +short
   # Should return: 35.154.11.108
   ```

2. **Wait for DNS:**
   - DNS can take 5-30 minutes to propagate
   - Try certbot command again after waiting

3. **Check Nginx:**
   ```bash
   sudo nginx -t
   curl http://as.buzeye.com
   # Should return something (not connection refused)
   ```

### WhatsApp Webhook Not Receiving Messages

**Symptom:** Messages sent to WhatsApp number don't trigger webhook

**Debugging steps:**

1. **Verify webhook URL:**
   ```bash
   curl -X GET "https://as.buzeye.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
   # Should return: test
   ```

2. **Check Meta webhook subscriptions:**
   - Meta Dashboard → WhatsApp → Configuration → Webhook
   - Ensure "messages" is subscribed

3. **Check backend logs:**
   ```bash
   sudo docker logs -f crm_as_backend | grep -i webhook
   ```

4. **Verify verify_token matches:**
   - Token in Meta dashboard
   - Token in docker-compose.yml WHATSAPP_WEBHOOK_VERIFY_TOKEN
   - Token in database whatsapp_config table

5. **Test number whitelist:**
   - In test mode, only whitelisted numbers can send messages
   - Add number: Meta Dashboard → WhatsApp → API Setup → Test Number

### Login Not Working

**Symptom:** "Invalid credentials" error

**Checks:**

1. **Verify admin user exists:**
   ```bash
   sudo docker exec -it crm_as_database psql -U crm_as -d crm_as
   ```
   ```sql
   SELECT email, name, role FROM users WHERE email = 'admin@as.com';
   ```

2. **Reset admin password:**
   ```bash
   # Generate new hash
   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Sorav1900', 10));"
   
   # Update in database
   sudo docker exec -it crm_as_database psql -U crm_as -d crm_as
   ```
   ```sql
   UPDATE users SET password = '$2a$10$...' WHERE email = 'admin@as.com';
   ```

3. **Check backend logs for errors:**
   ```bash
   sudo docker logs crm_as_backend | grep -i login
   ```

### Frontend Shows Blank Page

**Symptom:** Browser shows blank page or loading spinner

**Checks:**

1. **Browser console errors:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Common: CORS errors, API connection refused

2. **Check CORS configuration:**
   ```bash
   sudo docker logs crm_as_backend | grep -i cors
   ```

3. **Verify API connection:**
   ```bash
   # From browser console
   fetch('https://as.buzeye.com/api/health')
     .then(r => r.json())
     .then(console.log)
   ```

4. **Check frontend logs:**
   ```bash
   sudo docker logs crm_as_frontend
   ```

### Plan Features Not Working

**Symptom:** Enterprise features blocked or showing upgrade prompt

**Fixes:**

1. **Verify plan in master database:**
   ```bash
   sudo docker exec -it crm_database psql -U crm_user -d crm_master
   ```
   ```sql
   SELECT slug, plan, plan_limits FROM tenants WHERE slug = 'as';
   -- Should show: plan = 'enterprise', plan_limits = {"users": -1, ...}
   ```

2. **Sync plan limits:**
   ```sql
   UPDATE tenants t
   SET plan_limits = pc.limits
   FROM plan_configurations pc
   WHERE t.plan = pc.plan_name AND t.slug = 'as';
   ```

3. **Restart backend:**
   ```bash
   sudo docker-compose restart backend
   ```

---

## Appendix

### A. Port Allocation Pattern

Each tenant gets 3 unique ports (auto-assigned by provisioning script):

| Tenant # | Frontend | Backend | Database |
|----------|----------|---------|----------|
| Admin | 5173 | 5000 | 5432 |
| 1st Tenant | 5180 | 5010 | 5433 |
| 2nd Tenant | 5181 | 5011 | 5434 |
| 3rd Tenant | 5182 | 5012 | 5435 |

**Pattern:**
- Frontend: 5180 + (n-1)
- Backend: 5010 + (n-1)
- Database: 5433 + (n-1)

### B. Database Schema Migrations

Each tenant database runs these migrations on provisioning:

1. **01-schema.sql** (schema-tenant.sql) - Core tables (users, customers, sales, etc.)
2. **02-enhanced.sql** - Proposals, opportunities, leads, follow-ups
3. **03-gst.sql** - GST compliance tables and views
4. **04-customer-fields.sql** - Extended customer fields
5. **05-customer-sector.sql** - Business sector categorization
6. **06-opportunity-workflow.sql** - Sales pipeline workflow
7. **07-gst-fields.sql** - Additional GST fields
8. **08-udhar-khata.sql** - Credit ledger views and triggers

### C. Master Database Structure

The master database (crm_master) contains:

**Tables:**
- `plan_configurations` - Plan definitions (3 rows: Starter, Professional, Enterprise)
- `tenants` - All provisioned tenants with plan assignments
- `plan_change_requests` - Plan upgrade/downgrade history

**Key Columns in tenants table:**
- `slug` - Subdomain identifier
- `company_name` - Full company name
- `plan` - Current plan (starter/professional/enterprise)
- `plan_limits` - JSONB with limit values from plan_configurations
- `current_usage` - JSONB tracking current usage
- `status` - active/suspended/cancelled
- `domain` - Full domain (e.g., as.buzeye.com)

### D. WhatsApp API Endpoints

**Backend routes:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/whatsapp/webhook | Meta verification |
| POST | /api/whatsapp/webhook | Incoming message handler |
| GET | /api/whatsapp/config | Get WhatsApp configuration |
| POST | /api/whatsapp/send | Send WhatsApp message (admin) |

**Webhook flow:**
1. User sends WhatsApp message
2. Meta posts to /api/whatsapp/webhook
3. Backend extracts message and sender
4. AI controller processes message via runAgenticLoop
5. AI generates response
6. Backend sends via Meta Graph API
7. Conversation logged in whatsapp_conversations table

### E. Useful Commands Reference

**Container management:**
```bash
# View all tenant containers
sudo docker ps | grep crm_

# Stop tenant
cd /home/ubuntu/CRM/tenants/as
sudo docker-compose down

# Start tenant
sudo docker-compose up -d

# Restart specific service
sudo docker-compose restart backend

# Rebuild and restart
sudo docker-compose up -d --build backend

# View logs
sudo docker logs -f crm_as_backend
sudo docker logs --tail 100 crm_as_backend
```

**Database access:**
```bash
# Connect to tenant database
sudo docker exec -it crm_as_database psql -U crm_as -d crm_as

# Connect to master database
sudo docker exec -it crm_database psql -U crm_user -d crm_master

# Run SQL file
sudo docker exec -i crm_as_database psql -U crm_as -d crm_as < backup.sql

# Backup database
sudo docker exec crm_as_database pg_dump -U crm_as crm_as > backup.sql
```

**Nginx:**
```bash
# Test configuration
sudo nginx -t

# Reload (apply config changes)
sudo systemctl reload nginx

# Restart (full restart)
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

**SSL/Certbot:**
```bash
# List certificates
sudo certbot certificates

# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name as.buzeye.com

# Test renewal (dry run)
sudo certbot renew --dry-run
```

### F. Security Best Practices

**Environment Variables:**
- ✅ Never commit .env files to git
- ✅ Use strong, unique passwords for each tenant
- ✅ Rotate API keys quarterly
- ✅ Use environment-specific keys (dev vs production)

**Database:**
- ✅ Each tenant has isolated database
- ✅ Unique credentials per tenant
- ✅ Regular backups (daily recommended)
- ✅ Enable SSL for database connections in production

**API Keys:**
- ✅ Store in environment variables only
- ✅ Monitor usage and set spending limits (OpenAI)
- ✅ Use permanent tokens for production (WhatsApp)
- ✅ Rotate tokens if compromised

**Access Control:**
- ✅ Change default admin password immediately
- ✅ Use strong passwords (min 12 characters)
- ✅ Enable 2FA where possible
- ✅ Limit SSH access to specific IPs
- ✅ Regular security audits

### G. Monitoring Recommendations

**Container Health:**
```bash
# Check once daily
sudo docker ps | grep -E 'crm_|STATUS'
# All should show "Up" not "Restarting"
```

**Database Size:**
```bash
sudo docker exec crm_as_database psql -U crm_as -d crm_as -c "
SELECT 
    pg_size_pretty(pg_database_size('crm_as')) as db_size,
    pg_size_pretty(pg_total_relation_size('customers')) as customers_size,
    pg_size_pretty(pg_total_relation_size('sales')) as sales_size;
"
```

**API Usage:**
```bash
# OpenAI usage: Check dashboard.openai.com
# WhatsApp usage: Check business.facebook.com
```

**Error Monitoring:**
```bash
# Check for errors in last hour
sudo docker logs --since 1h crm_as_backend 2>&1 | grep -i error
```

### H. Backup Strategy

**Database Backups:**
```bash
# Create backup script: /home/ubuntu/CRM/scripts/backup-tenant.sh
#!/bin/bash
TENANT=$1
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/home/ubuntu/CRM/backups/${TENANT}
mkdir -p ${BACKUP_DIR}

sudo docker exec crm_${TENANT}_database pg_dump -U crm_${TENANT} crm_${TENANT} | gzip > ${BACKUP_DIR}/backup_${DATE}.sql.gz

# Keep only last 7 days
find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +7 -delete
```

**Usage:**
```bash
sudo bash /home/ubuntu/CRM/scripts/backup-tenant.sh as
```

**Restore:**
```bash
gunzip < backup_20260414_120000.sql.gz | sudo docker exec -i crm_as_database psql -U crm_as -d crm_as
```

---

## Summary Checklist

Use this checklist when onboarding a new tenant:

### Provisioning
- [ ] Run provision-tenant.sh script
- [ ] Verify containers are running (docker ps)
- [ ] Check provisioning output for errors
- [ ] Confirm tenant added to registry.json

### DNS & SSL
- [ ] Create DNS A record
- [ ] Wait for DNS propagation (dig check)
- [ ] Update Nginx configuration
- [ ] Reload Nginx (no errors)
- [ ] Obtain SSL certificate with certbot
- [ ] Verify HTTPS works (curl test)

### Environment Configuration
- [ ] Add OPENAI_API_KEY to docker-compose.yml
- [ ] Add WhatsApp variables (if Enterprise)
- [ ] Verify MASTER_DB_* variables
- [ ] Restart backend container
- [ ] Check backend logs (no errors)

### WhatsApp (Enterprise Only)
- [ ] Create Meta Developer app
- [ ] Configure webhook URL and verify token
- [ ] Get phone number ID and access token
- [ ] Update docker-compose.yml with WhatsApp config
- [ ] Insert config into database whatsapp_config table
- [ ] Test webhook with curl
- [ ] Send test message from WhatsApp
- [ ] Verify AI response received

### Testing
- [ ] Login with admin credentials
- [ ] Dashboard loads correctly
- [ ] Plan usage widget shows correct plan
- [ ] AI chatbot responds
- [ ] Voice input works (Enterprise/Professional)
- [ ] WhatsApp integration works (Enterprise)
- [ ] No console errors in browser

### Security
- [ ] Change admin password
- [ ] Review .env file permissions (600)
- [ ] Verify no secrets in git
- [ ] Enable database backups
- [ ] Document credentials securely

---

## Support & Resources

**Documentation:**
- Architecture: `/home/ubuntu/CRM/ARCHITECTURE.md`
- Production Setup: `/home/ubuntu/CRM/PRODUCTION_SETUP.md`
- AI Implementation: `/home/ubuntu/CRM/AI_IMPLEMENTATION_GUIDE.md`
- Plan System: `/home/ubuntu/CRM/PLAN_BASED_ACCESS_IMPLEMENTATION.md`

**Logs Location:**
- Nginx error log: `/var/log/nginx/error.log`
- Certbot logs: `/var/log/letsencrypt/letsencrypt.log`
- Container logs: `sudo docker logs <container_name>`

**External Resources:**
- Meta WhatsApp API: [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- OpenAI API: [platform.openai.com/docs](https://platform.openai.com/docs)
- PostgreSQL Docs: [postgresql.org/docs](https://www.postgresql.org/docs/)

---

**End of Tenant Onboarding Guide**

*Last Updated: April 14, 2026*  
*Version: 2.0 - Multi-Tenant with WhatsApp Integration*
