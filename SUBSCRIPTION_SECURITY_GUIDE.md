# Buzeye CRM - Subscription & Security Guide

## Overview

This guide covers how to run Buzeye as a **subscription-based SaaS CRM** where:
- **No self-signup** – Only you (the owner) can onboard new clients
- ** tenant isolation** – Each client sees only their own data
- **Multi-tenant architecture options** – One DB vs Database-per-tenant

---

## ✅ Already Implemented

### 1. **Sign Up Removed**
- Login page shows only Sign In (no registration form)
- Backend `/api/auth/register` returns 403 Forbidden
- Message shown: "Contact admin to get access"

### 2. **Admin-Only User Management**
- Only users with `role = 'admin'` can access `/admin` page
- Admin can create, edit, delete users and assign roles
- New users are created by admin only

---

## Multi-Tenant Architecture Options

### Option A: Tenant ID (Row-Level) – **Recommended to Start**

**How it works:**
- Add `tenant_id` (or `organization_id`) to: `users`, `customers`, `sales`, `costs`, `proposals`, `opportunities`, etc.
- Every query filters by `tenant_id` from the logged-in user’s JWT
- One database, one app instance

**Pros:** Simple, one codebase, easy to deploy  
**Cons:** Requires strict query scoping

**Implementation:**
```
1. Create `tenants` table (id, name, plan, status)
2. Add tenant_id to users table
3. Add tenant_id to all data tables
4. Middleware: Extract tenant_id from JWT, inject in every query
5. Sign up removed ✓ (already done)
```

---

### Option B: Schema Per Tenant

**How it works:**
- One database, separate PostgreSQL schema per tenant (e.g. `tenant_abc`, `tenant_xyz`)
- On login, set `search_path` to the tenant schema
- Same tables, different schemas

**Pros:** Strong isolation, simpler than DB-per-tenant  
**Cons:** Schema migrations across multiple schemas

---

### Option C: Database Per Tenant

**How it works:**
- Each client has a separate PostgreSQL database
- Connection string chosen from `tenant_id` at runtime
- Complete data isolation

**Pros:** Maximum isolation, easy backup/restore per tenant  
**Cons:** More complex infra, more resources

---

### Option D: Separate Deployment Per Tenant ✅ IMPLEMENTED

**How it works:**
- Each client gets own app + database (e.g. `acme.buzeye.com`)
- Subdomains: `{slug}.buzeye.com` → isolated Docker stack per tenant
- Separate PostgreSQL, backend, frontend containers

**Pros:** Strong isolation, custom domains, compliance-friendly  
**Cons:** Higher cost, more ops overhead

**Implementation:** `scripts/provision-tenant.sh` + `scripts/README.md`

---

## Recommended Security Measures

### 1. **Tenant Isolation (Core)**

```sql
-- Add to schema
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(50) UNIQUE,
  plan VARCHAR(50) DEFAULT 'basic',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE customers ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
-- ... repeat for all data tables

-- Every query must include: WHERE tenant_id = $current_user_tenant_id
```

### 2. **Backend Middleware**

```javascript
// middleware/tenantMiddleware.js
const getTenantFromUser = (req) => req.user?.tenant_id;

const requireTenant = (req, res, next) => {
  if (!req.user?.tenant_id) {
    return res.status(403).json({ error: 'No tenant assigned' });
  }
  next();
};

// In every route that fetches data:
// WHERE tenant_id = req.user.tenant_id
```

### 3. **JWT Tenant Scope**

- Include `tenant_id` in JWT payload on login
- Backend validates `tenant_id` on every request
- Never trust `tenant_id` from client; always use server-side value

### 4. **Admin vs Tenant Admin**

- **Super Admin (you):** Can create tenants, manage all tenants, see billing
- **Tenant Admin (client):** Can manage users within their tenant only
- Separate role: `super_admin` vs `admin` vs `sales`

### 5. **API Security**

- Rate limiting per tenant (e.g. `express-rate-limit`)
- CORS restricted to your domains
- Helmet for security headers
- Input validation (e.g. joi, express-validator)
- SQL injection prevention via parameterized queries

### 6. **Data Access Patterns**

- Enforce `tenant_id` in all queries
- Central helper: `db.query('SELECT * FROM customers WHERE tenant_id = $1 AND id = $2', [tenantId, id])`
- Never rely on `req.body.tenant_id` – always from JWT/session

### 7. **Audit Logging**

- Log who accessed/updated what and when
- Store: `user_id`, `tenant_id`, `action`, `resource`, `timestamp`
- Useful for support and compliance

### 8. **Subscription and Billing**

- Integrate Stripe/Razorpay for recurring billing
- Check `tenants.status` and `tenants.plan` before allowing access
- Disable or limit features when subscription is expired

---

## Step-by-Step: Tenant ID Implementation

### Phase 1: Database (1–2 hours)

1. Run migration for `tenants` table
2. Add `tenant_id` to all data tables
3. Add `tenant_id` to `users`
4. Create default tenant and migrate existing data into it
5. Add foreign keys and indexes on `tenant_id`

### Phase 2: Backend (2–3 hours)

1. Update `authController` to include `tenant_id` in JWT
2. Add tenant middleware to validate and attach `tenant_id` to `req`
3. Update all routes (customers, sales, etc.) to filter by `tenant_id`
4. Add super-admin check for tenant management
5. Create `/api/tenants` (super-admin only) for onboarding

### Phase 3: Admin Onboarding (1–2 hours)

1. Add “Tenants” section in Admin (super-admin only)
2. Create tenant + first admin user in one flow
3. Send welcome email with temp password (optional)

---

## Quick Reference Checklist

| Security Measure | Status | Priority |
|------------------|--------|----------|
| Sign up removed | ✅ Done | - |
| Admin-only user creation | ✅ Done | - |
| Tenant ID in all tables | 🔲 Pending | High |
| JWT includes tenant_id | 🔲 Pending | High |
| All queries filter by tenant | 🔲 Pending | High |
| Super-admin role | 🔲 Pending | Medium |
| Rate limiting | 🔲 Pending | Medium |
| Audit logging | 🔲 Pending | Low |
| Subscription / billing | 🔲 Pending | Medium |
| HTTPS only | ✅ (Nginx/SSL) | - |

---

## Subscription Tiers (Example)

| Plan | Price | Features |
|------|-------|----------|
| Starter | ₹999/mo | 1 user, 100 customers |
| Growth | ₹2,499/mo | 5 users, 500 customers |
| Business | ₹4,999/mo | 15 users, unlimited |
| Enterprise | Custom | DB-per-tenant, SLA |

---

## Onboarding Flow (Admin Only)

1. You receive a new client request
2. Create tenant in Admin → Tenants
3. Create first user (client admin) for that tenant
4. Send credentials (email + temp password)
5. Client logs in and sees only their data
6. Client manages their own team via Admin (within tenant)

---

## Compliance Notes

- **GDPR:** Tenant isolation supports data separation requirements
- **Data residency:** Database-per-tenant allows region-specific hosting
- **Audit:** Logs support regulatory and security reviews

---

## Next Steps

1. Implement `tenants` table and `tenant_id` migration
2. Update auth to include `tenant_id` in JWT
3. Add tenant-scoped middleware and update all data queries
4. Add super-admin tenant management UI
5. Integrate Stripe/Razorpay for subscription billing
6. Add audit logging for key actions

---

*Document version: 1.0 | Buzeye CRM Subscription Security*
