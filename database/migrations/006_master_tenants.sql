-- Master Tenants Registry
-- Used for Separate Deployment Per Tenant (Option D)
-- This database tracks all tenant deployments

CREATE DATABASE crm_master;

\c crm_master

-- Tenants registry: one row per client/organization
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) NOT NULL UNIQUE,
    
    -- Database connection (per-tenant DB)
    db_name VARCHAR(100) NOT NULL,
    db_user VARCHAR(100) NOT NULL,
    db_password VARCHAR(255) NOT NULL,
    
    -- Deployment
    frontend_port INTEGER UNIQUE NOT NULL,
    backend_port INTEGER UNIQUE NOT NULL,
    db_port INTEGER UNIQUE NOT NULL,
    
    -- Subscription
    plan VARCHAR(50) DEFAULT 'starter',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
    
    -- Admin contact
    admin_email VARCHAR(255) NOT NULL,
    admin_name VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

COMMENT ON TABLE tenants IS 'Registry of all tenant deployments - each has own DB and ports';
