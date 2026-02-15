# 🔧 Fix Domain Login Issue

## Problem
- ✅ Login works when accessing via IP: `http://43.204.98.56:5173`
- ❌ Login fails when accessing via domain: `http://buzeye.com:5173`

## Root Cause
The frontend is configured to call the API using the IP address (`http://43.204.98.56:5000/api`). When you access via domain, browser security blocks cross-origin requests.

---

## ✅ Solution

### Step 1: Update docker-compose.yml on Server

On your production server:

```bash
cd /home/ubuntu/CRM
git pull origin main
```

The `docker-compose.yml` has been updated from:
```yaml
VITE_API_URL: http://43.204.98.56:5000/api
```

To:
```yaml
VITE_API_URL: http://buzeye.com:5000/api
```

### Step 2: Rebuild and Restart Frontend

```bash
# Rebuild frontend with new API URL
docker-compose up -d --build frontend

# Wait for it to start
sleep 10

# Verify it's running
docker-compose ps
```

---

## 🧪 Test After Fix

1. **Clear browser cache** (important!)
   - Chrome/Edge: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
   - Or use Incognito/Private mode

2. **Access via domain:**
   - Go to: `http://buzeye.com:5173/login`

3. **Login with:**
   - Email: `admin@buzeye.com`
   - Password: `Buzeye@2026`

4. **Should now work!** ✅

---

## 🔍 How to Verify API URL

Open browser console (F12) and check Network tab:
- The login request should go to: `http://buzeye.com:5000/api/auth/login`
- NOT to: `http://43.204.98.56:5000/api/auth/login`

---

## 🌐 Alternative: Use Relative URLs

If you want the app to work with BOTH IP and domain, you can use relative URLs:

### Option 1: Same Port Backend (Requires Nginx)
Set up Nginx to proxy both frontend and backend on the same port:

```nginx
server {
    listen 80;
    server_name buzeye.com www.buzeye.com;

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

Then change VITE_API_URL to:
```yaml
VITE_API_URL: /api
```

This way, the frontend will use the same hostname automatically.

---

## 📋 Quick Commands Reference

```bash
# Pull latest code
cd /home/ubuntu/CRM
git pull origin main

# Rebuild frontend
docker-compose up -d --build frontend

# Check logs if issues
docker logs crm_frontend --tail 50
docker logs crm_backend --tail 50

# Restart all services
docker-compose restart

# Check all services running
docker-compose ps
```

---

## ✅ After This Fix

- ✅ Login via IP: `http://43.204.98.56:5173` - **May not work anymore**
- ✅ Login via domain: `http://buzeye.com:5173` - **Will work!**

**Best Practice:** Always use the domain (buzeye.com) going forward.

---

## 🎯 Optional: Remove Port from URL

If you want clean URLs like `http://buzeye.com` instead of `http://buzeye.com:5173`:

1. **Install Nginx:**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Configure Nginx** (see Option 1 above)

3. **Enable site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/buzeye /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Update docker-compose.yml:**
   ```yaml
   VITE_API_URL: /api
   ```

5. **Access at:**
   - `http://buzeye.com` (clean URL!)

---

*This fix ensures the app works consistently when accessed via domain name.*
