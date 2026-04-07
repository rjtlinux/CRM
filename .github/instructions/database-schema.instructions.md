---
description: "Instructions for database schema and migration development. Use when: creating new tables, modifying schema, writing migrations, adding indexes, creating views. Enforces PostgreSQL best practices, multi-tenant patterns, and production safety."
applyTo: "database/**/*.sql"
---

# Database Schema and Migration Guidelines

## Migration Naming Convention

```
database/migrations/
  001_initial_schema.sql
  002_add_udhar_khata.sql
  003_add_opportunities.sql
  004_add_whatsapp.sql
  005_gst_compliance.sql
  006_master_tenants.sql
```

**Format:** `{number}_{descriptive_name}.sql`

## Migration File Structure

```sql
-- Migration: [Descriptive Title]
-- Date: YYYY-MM-DD
-- Purpose: Clear description of what this migration does and why

-- Safety checks
DO $$ 
BEGIN
    -- Check if migration already applied
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'new_table') THEN
        -- Safe to proceed
        RAISE NOTICE 'Applying migration...';
    ELSE
        RAISE NOTICE 'Migration already applied, skipping...';
    END IF;
END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS new_table (
    id SERIAL PRIMARY KEY,
    -- columns...
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_new_table_field ON new_table(field);

-- Add foreign keys (if not in CREATE TABLE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_new_table_user'
    ) THEN
        ALTER TABLE new_table
        ADD CONSTRAINT fk_new_table_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create views
CREATE OR REPLACE VIEW new_view AS
SELECT ...;

-- Insert seed data (if needed)
INSERT INTO new_table (field1, field2)
SELECT 'value1', 'value2'
WHERE NOT EXISTS (SELECT 1 FROM new_table WHERE field1 = 'value1');

-- Migration complete
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully';
END $$;
```

## Table Creation Patterns

### Standard Table Pattern
```sql
CREATE TABLE IF NOT EXISTS table_name (
    -- Primary key (always SERIAL)
    id SERIAL PRIMARY KEY,
    
    -- Foreign keys
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Data columns
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'active',
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_amount_positive CHECK (amount >= 0),
    CONSTRAINT chk_status_valid CHECK (status IN ('active', 'inactive', 'pending'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_name_user_id ON table_name(user_id);
CREATE INDEX IF NOT EXISTS idx_table_name_customer_id ON table_name(customer_id);
CREATE INDEX IF NOT EXISTS idx_table_name_created_at ON table_name(created_at);
CREATE INDEX IF NOT EXISTS idx_table_name_status ON table_name(status);

-- Comments
COMMENT ON TABLE table_name IS 'Description of table purpose';
COMMENT ON COLUMN table_name.amount IS 'Amount in INR';
```

### Junction/Mapping Table
```sql
CREATE TABLE IF NOT EXISTS table1_table2 (
    id SERIAL PRIMARY KEY,
    table1_id INTEGER NOT NULL REFERENCES table1(id) ON DELETE CASCADE,
    table2_id INTEGER NOT NULL REFERENCES table2(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicates
    CONSTRAINT uq_table1_table2 UNIQUE (table1_id, table2_id)
);

CREATE INDEX IF NOT EXISTS idx_table1_table2_table1 ON table1_table2(table1_id);
CREATE INDEX IF NOT EXISTS idx_table1_table2_table2 ON table1_table2(table2_id);
```

## Column Types and Patterns

### Common Data Types
```sql
-- Identity/Primary Key
id SERIAL PRIMARY KEY

-- Foreign Keys
user_id INTEGER NOT NULL REFERENCES users(id)
customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE

-- Text
name VARCHAR(255) NOT NULL              -- Limited text
description TEXT                        -- Unlimited text
email VARCHAR(255) UNIQUE              -- Unique text
status VARCHAR(50) DEFAULT 'active'    -- Enum-like field

-- Numbers
amount DECIMAL(15, 2)                  -- Money (15 digits, 2 decimal)
quantity INTEGER DEFAULT 0             -- Whole numbers
percentage DECIMAL(5, 2)               -- Percentage (e.g., 99.99)

-- Dates and Times
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
date_field DATE
time_field TIME

-- Boolean
is_active BOOLEAN DEFAULT true
has_gst BOOLEAN DEFAULT false

-- JSON (for flexible data)
metadata JSONB                         -- Binary JSON (faster, indexable)
settings JSON                          -- Regular JSON
```

### Indian-Specific Patterns
```sql
-- Phone numbers (support +91)
phone VARCHAR(20)                      -- +91 XXXXX XXXXX
mobile VARCHAR(20)

-- GST number (15 characters)
gst_number VARCHAR(15)
CONSTRAINT chk_gst_format CHECK (gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')

-- PAN number (10 characters)
pan_number VARCHAR(10)
CONSTRAINT chk_pan_format CHECK (pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$')

-- Indian states (for GST)
state VARCHAR(50)
state_code VARCHAR(2)                  -- e.g., 'MH', 'DL'

-- Currency in INR
amount_inr DECIMAL(15, 2)
```

## Indexes

### When to Create Indexes
```sql
-- Always index:
-- 1. Foreign keys
CREATE INDEX idx_sales_customer_id ON sales(customer_id);

-- 2. Frequently queried columns
CREATE INDEX idx_customers_email ON customers(email);

-- 3. Date columns used in WHERE/ORDER BY
CREATE INDEX idx_sales_sale_date ON sales(sale_date);

-- 4. Status/enum columns used in filtering
CREATE INDEX idx_customers_status ON customers(status);

-- Composite indexes for common query patterns
CREATE INDEX idx_sales_customer_date ON sales(customer_id, sale_date DESC);

-- Partial indexes for specific cases
CREATE INDEX idx_active_customers ON customers(created_at) WHERE status = 'active';

-- Text search indexes
CREATE INDEX idx_customers_name_search ON customers USING gin(to_tsvector('simple', company_name));
```

### Index Naming Convention
```
idx_{table}_{column}
idx_{table}_{col1}_{col2}      -- Composite
idx_{table}_{column}_partial   -- Partial index
```

## Views

### Simple Aggregation View
```sql
CREATE OR REPLACE VIEW udhar_khata_summary AS
SELECT 
    customer_id,
    c.company_name,
    c.contact_person,
    SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) as total_debit,
    SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) as total_credit,
    SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END) as outstanding_balance,
    MAX(entry_date) as last_transaction_date,
    COUNT(*) as transaction_count
FROM udhar_khata_entries u
JOIN customers c ON c.id = u.customer_id
GROUP BY customer_id, c.company_name, c.contact_person
HAVING SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END) > 0
ORDER BY outstanding_balance DESC;

COMMENT ON VIEW udhar_khata_summary IS 
'Summary of outstanding balances for all customers with credit';
```

### Complex Reporting View
```sql
CREATE OR REPLACE VIEW customer_360_view AS
SELECT 
    c.id as customer_id,
    c.company_name,
    c.contact_person,
    c.email,
    c.phone,
    c.gst_number,
    
    -- Sales summary
    COUNT(DISTINCT s.id) as total_sales,
    COALESCE(SUM(s.amount), 0) as total_sales_amount,
    MAX(s.sale_date) as last_sale_date,
    
    -- Udhar summary
    COALESCE(uk.outstanding_balance, 0) as outstanding_balance,
    
    -- Proposal summary
    COUNT(DISTINCT p.id) as total_proposals,
    COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) as accepted_proposals,
    
    -- Recency
    GREATEST(
        MAX(s.sale_date),
        MAX(p.created_at::DATE),
        uk.last_transaction_date
    ) as last_interaction_date
    
FROM customers c
LEFT JOIN sales s ON s.customer_id = c.id
LEFT JOIN udhar_khata_summary uk ON uk.customer_id = c.id
LEFT JOIN proposals p ON p.customer_id = c.id
WHERE c.status = 'active'
GROUP BY c.id, c.company_name, c.contact_person, c.email, c.phone, c.gst_number, uk.outstanding_balance, uk.last_transaction_date
ORDER BY last_interaction_date DESC NULLS LAST;
```

## Constraints

### Check Constraints
```sql
-- Positive amounts
CONSTRAINT chk_amount_positive CHECK (amount > 0)

-- Valid email format
CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')

-- Enum validation
CONSTRAINT chk_status CHECK (status IN ('draft', 'pending', 'approved', 'rejected'))

-- Date range
CONSTRAINT chk_date_not_future CHECK (sale_date <= CURRENT_DATE)

-- Dependent fields
CONSTRAINT chk_gst_business CHECK (
    (has_gst = true AND gst_number IS NOT NULL) OR
    (has_gst = false AND gst_number IS NULL)
)
```

### Foreign Key Patterns
```sql
-- Cascade delete (when parent deleted, child deleted)
customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE

-- Set null (when parent deleted, child FK set to NULL)
created_by INTEGER REFERENCES users(id) ON DELETE SET NULL

-- Restrict (prevent parent delete if children exist)
customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT

-- No action (default - same as RESTRICT)
customer_id INTEGER REFERENCES customers(id)
```

### Unique Constraints
```sql
-- Single column
email VARCHAR(255) UNIQUE

-- Multiple columns (composite unique)
CONSTRAINT uq_proposal_number UNIQUE (proposal_number, customer_id)

-- Conditional unique (partial unique)
CREATE UNIQUE INDEX uq_active_email ON users(email) WHERE status = 'active';
```

## Altering Existing Tables

### Add Column
```sql
-- Add column with safety check
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'sector'
    ) THEN
        ALTER TABLE customers ADD COLUMN sector VARCHAR(100);
        RAISE NOTICE 'Column "sector" added to customers table';
    ELSE
        RAISE NOTICE 'Column "sector" already exists, skipping';
    END IF;
END $$;

-- Add with default value
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add NOT NULL column with default
ALTER TABLE customers ADD COLUMN status VARCHAR(50) DEFAULT 'active' NOT NULL;
```

### Modify Column
```sql
-- Change data type
ALTER TABLE customers ALTER COLUMN phone TYPE VARCHAR(20);

-- Set NOT NULL
ALTER TABLE customers ALTER COLUMN email SET NOT NULL;

-- Drop NOT NULL
ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;

-- Set default
ALTER TABLE customers ALTER COLUMN status SET DEFAULT 'active';

-- Drop default
ALTER TABLE customers ALTER COLUMN status DROP DEFAULT;
```

### Add Constraint
```sql
-- Add foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_sales_customer'
    ) THEN
        ALTER TABLE sales 
        ADD CONSTRAINT fk_sales_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraint
ALTER TABLE sales ADD CONSTRAINT chk_amount_positive CHECK (amount > 0);

-- Add unique constraint
ALTER TABLE customers ADD CONSTRAINT uq_customers_email UNIQUE (email);
```

### Drop Items (Use with Caution)
```sql
-- Drop column
ALTER TABLE customers DROP COLUMN IF EXISTS old_field;

-- Drop constraint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS old_constraint;

-- Drop index
DROP INDEX IF EXISTS idx_old_index;
```

## Multi-Tenant Considerations

### Tenant-Specific Schema
When creating schema for new tenants (used in provisioning):

```sql
-- In schema-tenant.sql
-- This gets applied to each new tenant database

-- Core tables that EVERY tenant needs
CREATE TABLE users (...);
CREATE TABLE customers (...);
CREATE TABLE sales (...);
CREATE TABLE udhar_khata_entries (...);

-- Standard indexes for performance
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(sale_date);

-- Standard views
CREATE OR REPLACE VIEW udhar_khata_summary AS ...;

-- No tenant_id column needed - isolation by database
```

### Updating Tenant Databases
```sql
-- When pushing schema update to all tenants:
-- 1. Test on staging tenant first
-- 2. Create idempotent migration (IF NOT EXISTS)
-- 3. Script the rollout:

-- For each tenant in registry
ssh ubuntu@server
cd /home/ubuntu/CRM/tenants/{tenant_slug}
docker exec -i crm_{slug}_database psql -U crm_{slug} -d crm_{slug} < /path/to/migration.sql
```

## Triggers

### Auto-Update Timestamp
```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to table
CREATE TRIGGER trigger_update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Audit Trail
```sql
-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Performance Optimization

### Query Optimization Patterns
```sql
-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE
SELECT * FROM sales WHERE customer_id = 123 AND sale_date > '2024-01-01';

-- Add appropriate indexes based on EXPLAIN output
CREATE INDEX idx_sales_customer_date ON sales(customer_id, sale_date);
```

### Materialized Views (for expensive queries)
```sql
-- Create materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS sales_monthly_summary AS
SELECT 
    DATE_TRUNC('month', sale_date) as month,
    COUNT(*) as total_sales,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount
FROM sales
GROUP BY DATE_TRUNC('month', sale_date)
ORDER BY month DESC;

-- Create index on materialized view
CREATE INDEX idx_sales_monthly_summary_month ON sales_monthly_summary(month);

-- Refresh periodically (can be done via cron or trigger)
REFRESH MATERIALIZED VIEW sales_monthly_summary;

-- Or refresh concurrently (non-blocking)
CREATE UNIQUE INDEX ON sales_monthly_summary(month);
REFRESH MATERIALIZED VIEW CONCURRENTLY sales_monthly_summary;
```

## Testing Migrations

### Before Applying to Production

1. **Test locally**
```bash
# Local database
psql -U crm_user -d crm_database -f database/migrations/new_migration.sql
```

2. **Verify schema changes**
```sql
-- Check table exists
\dt table_name

-- Check columns
\d table_name

-- Check indexes
\di table_name

-- Check constraints
\d+ table_name
```

3. **Test rollback (if possible)**
```sql
-- Create rollback migration
-- database/migrations/rollback_xxx.sql
DROP TABLE IF EXISTS new_table CASCADE;
DROP VIEW IF EXISTS new_view;
```

4. **Check data integrity**
```sql
-- Verify no broken foreign keys
SELECT * FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY';

-- Check for NULL values where NOT NULL expected
SELECT COUNT(*) FROM table_name WHERE required_field IS NULL;
```

## Common Mistakes to Avoid

### ❌ Don't Do
```sql
-- Don't use VARCHAR without limit for large text
description VARCHAR        -- Use TEXT instead

-- Don't forget ON DELETE behavior
customer_id INTEGER REFERENCES customers(id)  -- What happens when customer deleted?

-- Don't create indexes without checking if they exist
CREATE INDEX idx_name ...  -- Will fail if exists

-- Don't use DECIMAL for money without precision
amount DECIMAL            -- Use DECIMAL(15, 2)

-- Don't forget migration safety checks
ALTER TABLE customers ADD COLUMN email VARCHAR(255);  -- Fails if re-run
```

### ✅ Do This
```sql
-- Use TEXT for large text fields
description TEXT

-- Specify ON DELETE behavior
customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE

-- Use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_name ...

-- Specify precision for DECIMAL
amount DECIMAL(15, 2)

-- Make migrations idempotent
DO $$
BEGIN
    IF NOT EXISTS (...) THEN
        ALTER TABLE ...
    END IF;
END $$;
```

## Production Safety Checklist

Before applying migration to production:

- [ ] Migration tested on local database
- [ ] Migration is idempotent (can run multiple times safely)
- [ ] Indexes created with IF NOT EXISTS
- [ ] Foreign keys have ON DELETE behavior specified
- [ ] Check constraints are appropriate
- [ ] Large tables: consider adding column with default separately from NOT NULL
- [ ] Rollback plan prepared
- [ ] Backup taken before applying
- [ ] Migration logged in version control
- [ ] Updated provisioning script for new tenants (if schema change)

## Schema Documentation

Add comments to database objects:

```sql
-- Table comments
COMMENT ON TABLE customers IS 'Customer master data with GST and contact information';

-- Column comments
COMMENT ON COLUMN customers.gst_number IS 'GST registration number (15 characters)';
COMMENT ON COLUMN sales.amount IS 'Sale amount in INR (Indian Rupees)';

-- View comments
COMMENT ON VIEW udhar_khata_summary IS 'Aggregated outstanding balance per customer';
```

Remember: Database is the source of truth. Migrations must be safe, tested, and reversible.
