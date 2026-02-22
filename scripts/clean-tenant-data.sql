-- Remove demo/seed data from a tenant database
-- Run: docker exec -i crm_<slug>_database psql -U crm_<slug> -d crm_<slug> < scripts/clean-tenant-data.sql
-- Example: docker exec -i crm_acme_database psql -U crm_acme -d crm_acme < scripts/clean-tenant-data.sql

BEGIN;

-- Delete in order (foreign key dependencies)
DELETE FROM proposal_items;
DELETE FROM proposals;
DELETE FROM costs;
DELETE FROM sales;
DELETE FROM customers;

-- Remove default demo admin (keep your provisioned admin)
DELETE FROM users WHERE email = 'admin@crm.com';

COMMIT;
