# Buzeye Deployment & Domain Routing

## Overview

| Domain | Purpose | Stack |
|--------|---------|-------|
| **buzeye.com** | Marketing site – what we do, strengths, contact | Marketing (port 3000) |
| **admin.buzeye.com** | Admin CRM – your dashboard, tenant management | Main CRM (ports 5173, 5000) |
| **{slug}.buzeye.com** | Client tenants (e.g. acme.buzeye.com) | Per-tenant stacks (provision-tenant.sh) |

---

## Quick Start

### 1. Marketing site (buzeye.com)

```bash
cd CRM
docker-compose -f docker-compose.marketing.yml up -d
```

Serves at http://localhost:3000

### 2. Admin CRM (admin.buzeye.com)

```bash
cd CRM
docker-compose up -d
# or: docker-compose -f docker-compose.admin.yml up -d
```

Serves at http://localhost:5173 (frontend), http://localhost:5000 (backend)

### 3. Nginx

Copy or include the routing config:

```bash
sudo cp nginx/buzeye-routing.conf /etc/nginx/sites-available/buzeye.conf
sudo ln -s /etc/nginx/sites-available/buzeye.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. DNS

```
buzeye.com      A  your_server_ip
www.buzeye.com  A  your_server_ip
admin.buzeye.com A your_server_ip
*.buzeye.com    A  your_server_ip  # for tenants
```

### 5. SSL

```bash
sudo certbot --nginx -d buzeye.com -d www.buzeye.com -d admin.buzeye.com
# For tenants: certbot --nginx -d acme.buzeye.com (or wildcard)
```

---

## Admin CRM (admin.buzeye.com)

- **Login:** admin@buzeye.com / Buzeye@2026 (after `database/reset_admin.sql`)
- **Tenants:** See all provisioned tenants, their subdomains, admin emails, ports
- **User Management:** Create/edit users for your admin instance

## Marketing Site (buzeye.com)

- Public landing page
- Features, strengths, contact info
- Link to **Admin Login** → admin.buzeye.com
