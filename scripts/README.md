# Buzeye CRM - Per-Tenant Provisioning (Option D)

## Architecture

Each client gets a **completely separate deployment**:
- **Subdomain:** `{slug}.buzeye.com` (e.g. acme.buzeye.com)
- **Own database:** Isolated PostgreSQL
- **Own containers:** Frontend, backend, database – separate from other tenants

## Quick Start

### 1. Provision a new tenant

```bash
cd /path/to/CRM/scripts
chmod +x provision-tenant.sh

./provision-tenant.sh acme "Acme Corp" admin@acme.com "John Doe"
```

This creates:
- `tenants/acme/` directory
- Docker stack: crm_acme_database, crm_acme_backend, crm_acme_frontend
- Admin user for the client
- Nginx config snippet

### 2. Add DNS

```
acme.buzeye.com  A  your_server_ip
```

For multiple tenants, use wildcard:
```
*.buzeye.com     A  your_server_ip
```

### 3. Configure Nginx

Add the generated config to Nginx:

```bash
# Copy tenant config
sudo cp tenants/acme/nginx.conf /etc/nginx/sites-available/acme.buzeye.com.conf
sudo ln -s /etc/nginx/sites-available/acme.buzeye.com.conf /etc/nginx/sites-enabled/

# Or include in main config
# include /path/to/CRM/tenants/*/nginx.conf;

sudo nginx -t && sudo systemctl reload nginx
```

### 4. Get SSL certificate

```bash
sudo certbot --nginx -d acme.buzeye.com
```

## Scripts

| Script | Purpose |
|-------|---------|
| `provision-tenant.sh` | Create new tenant (DB + containers + admin) |
| `list-tenants.sh` | List all provisioned tenants |

## Tenant Directory Structure

```
tenants/
├── acme/
│   ├── docker-compose.yml   # Isolated stack for acme
│   ├── .env                 # Credentials (keep secret!)
│   └── nginx.conf           # Subdomain routing
├── beta/
│   └── ...
└── registry.json            # Tenant registry (optional)
```

## Port Allocation

Each tenant gets unique ports:
- Tenant 1: Frontend 5180, Backend 5010, DB 5433
- Tenant 2: Frontend 5181, Backend 5011, DB 5434
- etc.

## Managing Tenants

### Start a tenant
```bash
cd tenants/acme
docker-compose up -d
```

### Stop a tenant
```bash
cd tenants/acme
docker-compose down
```

### View logs
```bash
docker logs crm_acme_backend -f
docker logs crm_acme_frontend -f
```

## Security Notes

- Each tenant's `.env` contains DB credentials – restrict access
- JWT_SECRET is unique per tenant
- No cross-tenant data access possible (separate DBs)
- Only you (server admin) can run provision-tenant.sh
