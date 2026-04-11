-- Migration 007: Plan-Based Access Control
-- Implements subscription plan enforcement with usage tracking

-- ============================================================================
-- MASTER DATABASE CHANGES (crm_master)
-- ============================================================================

-- Create plan configurations table
CREATE TABLE IF NOT EXISTS plan_configurations (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    price_inr INTEGER NOT NULL,
    price_period VARCHAR(20) DEFAULT 'month',
    limits JSONB NOT NULL,
    features JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default plan configurations
INSERT INTO plan_configurations (plan_name, display_name, price_inr, limits, features, sort_order) VALUES
('starter', 'Starter', 999, '{
  "max_customers": 500,
  "max_users": 2,
  "max_transactions_monthly": 1000,
  "max_opportunities": 50,
  "max_proposals": 20,
  "max_ai_commands_monthly": 100
}'::jsonb, '{
  "whatsapp": false,
  "ai_voice": false,
  "advanced_analytics": false,
  "custom_reports": false,
  "api_access": false,
  "priority_support": false
}'::jsonb, 1),

('professional', 'Professional', 2499, '{
  "max_customers": -1,
  "max_users": 5,
  "max_transactions_monthly": -1,
  "max_opportunities": 200,
  "max_proposals": 100,
  "max_ai_commands_monthly": 1000
}'::jsonb, '{
  "whatsapp": true,
  "ai_voice": true,
  "advanced_analytics": true,
  "custom_reports": true,
  "api_access": false,
  "priority_support": true
}'::jsonb, 2),

('enterprise', 'Enterprise', 0, '{
  "max_customers": -1,
  "max_users": -1,
  "max_transactions_monthly": -1,
  "max_opportunities": -1,
  "max_proposals": -1,
  "max_ai_commands_monthly": -1
}'::jsonb, '{
  "whatsapp": true,
  "ai_voice": true,
  "advanced_analytics": true,
  "custom_reports": true,
  "api_access": true,
  "priority_support": true,
  "dedicated_manager": true,
  "custom_integrations": true,
  "onpremise": true,
  "sla": true
}'::jsonb, 3)
ON CONFLICT (plan_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_inr = EXCLUDED.price_inr,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  updated_at = CURRENT_TIMESTAMP;

-- Add usage tracking columns to tenants table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'plan_limits') THEN
    ALTER TABLE tenants ADD COLUMN plan_limits JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'current_usage') THEN
    ALTER TABLE tenants ADD COLUMN current_usage JSONB DEFAULT '{
      "customers_count": 0,
      "users_count": 0,
      "transactions_this_month": 0,
      "opportunities_count": 0,
      "proposals_count": 0,
      "ai_commands_this_month": 0,
      "last_reset_date": null
    }'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'billing_cycle_start') THEN
    ALTER TABLE tenants ADD COLUMN billing_cycle_start DATE DEFAULT CURRENT_DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'next_billing_date') THEN
    ALTER TABLE tenants ADD COLUMN next_billing_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'plan_downgrade_to') THEN
    ALTER TABLE tenants ADD COLUMN plan_downgrade_to VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'plan_change_effective_date') THEN
    ALTER TABLE tenants ADD COLUMN plan_change_effective_date DATE;
  END IF;
END $$;

-- Create plan change requests table (for upgrade requests)
CREATE TABLE IF NOT EXISTS plan_change_requests (
    id SERIAL PRIMARY KEY,
    tenant_slug VARCHAR(50) NOT NULL,
    current_plan VARCHAR(50) NOT NULL,
    requested_plan VARCHAR(50) NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_change_requests_tenant ON plan_change_requests(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_plan_change_requests_status ON plan_change_requests(status);

-- Create function to sync plan limits from plan_configurations to tenants
CREATE OR REPLACE FUNCTION sync_tenant_plan_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- When tenant plan is updated, sync limits and features from plan_configurations
    UPDATE tenants t
    SET 
        plan_limits = pc.limits,
        updated_at = CURRENT_TIMESTAMP
    FROM plan_configurations pc
    WHERE t.id = NEW.id 
      AND pc.plan_name = NEW.plan;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-sync plan limits when plan is changed
DROP TRIGGER IF EXISTS trigger_sync_plan_limits ON tenants;
CREATE TRIGGER trigger_sync_plan_limits
    AFTER UPDATE OF plan ON tenants
    FOR EACH ROW
    WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
    EXECUTE FUNCTION sync_tenant_plan_limits();

-- Update existing tenants to have plan_limits from plan_configurations
UPDATE tenants t
SET plan_limits = pc.limits,
    current_usage = COALESCE(t.current_usage, '{
      "customers_count": 0,
      "users_count": 0,
      "transactions_this_month": 0,
      "opportunities_count": 0,
      "proposals_count": 0,
      "ai_commands_this_month": 0,
      "last_reset_date": null
    }'::jsonb)
FROM plan_configurations pc
WHERE pc.plan_name = t.plan
  AND t.plan_limits IS NULL OR t.plan_limits = '{}'::jsonb;

COMMENT ON TABLE plan_configurations IS 'Master plan definitions with limits and features (-1 means unlimited)';
COMMENT ON TABLE plan_change_requests IS 'Tenant upgrade/downgrade requests for admin approval';
COMMENT ON COLUMN tenants.plan_limits IS 'Current plan limits synced from plan_configurations';
COMMENT ON COLUMN tenants.current_usage IS 'Real-time usage tracking for plan enforcement';

-- ============================================================================
-- PER-TENANT DATABASE CHANGES (Apply to each tenant DB via provision script)
-- ============================================================================

-- Note: These changes should be applied to each tenant's database
-- They are included here for reference and will be applied via migration scripts

/*
-- Add created_by tracking to tables (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'customers' AND column_name = 'created_by') THEN
    ALTER TABLE customers ADD COLUMN created_by INTEGER REFERENCES users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sales' AND column_name = 'created_by') THEN
    ALTER TABLE sales ADD COLUMN created_by INTEGER REFERENCES users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'costs' AND column_name = 'created_by') THEN
    ALTER TABLE costs ADD COLUMN created_by INTEGER REFERENCES users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'opportunities' AND column_name = 'created_by') THEN
    ALTER TABLE opportunities ADD COLUMN created_by INTEGER REFERENCES users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'proposals' AND column_name = 'created_by') THEN
    ALTER TABLE proposals ADD COLUMN created_by INTEGER REFERENCES users(id);
  END IF;
END $$;

-- Add soft delete support for plan downgrades
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'customers' AND column_name = 'is_archived') THEN
    ALTER TABLE customers ADD COLUMN is_archived BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'opportunities' AND column_name = 'is_archived') THEN
    ALTER TABLE opportunities ADD COLUMN is_archived BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'proposals' AND column_name = 'is_archived') THEN
    ALTER TABLE proposals ADD COLUMN is_archived BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index on archived records
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_opportunities_active ON opportunities(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_proposals_active ON proposals(is_archived) WHERE is_archived = false;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify plan configurations
SELECT plan_name, display_name, price_inr, 
       limits->>'max_customers' as max_customers,
       limits->>'max_users' as max_users,
       features->>'whatsapp' as has_whatsapp
FROM plan_configurations 
ORDER BY sort_order;

-- Verify tenant plan limits are synced
SELECT slug, plan, 
       plan_limits->>'max_customers' as max_customers,
       current_usage->>'customers_count' as current_customers
FROM tenants 
ORDER BY created_at;
