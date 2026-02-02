-- Add new fields to customers table
-- Migration script v2

-- Add business type field (new or existing)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'new';

-- Add generation mode (lead source)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS generation_mode VARCHAR(50) DEFAULT 'web_enquiry';

-- Add contact person designation
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS contact_designation VARCHAR(100);

-- Add pincode/postal code
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);

-- Add company size
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_customers_business_type ON customers(business_type);
CREATE INDEX IF NOT EXISTS idx_customers_generation_mode ON customers(generation_mode);
CREATE INDEX IF NOT EXISTS idx_customers_company_size ON customers(company_size);

-- Update existing customers with default values
UPDATE customers SET business_type = 'new' WHERE business_type IS NULL;
UPDATE customers SET generation_mode = 'web_enquiry' WHERE generation_mode IS NULL;

COMMENT ON COLUMN customers.business_type IS 'Whether this is a new business or existing/old business';
COMMENT ON COLUMN customers.generation_mode IS 'How the lead was generated: cold_call, web_enquiry, exhibition, reference';
COMMENT ON COLUMN customers.contact_designation IS 'Job title/designation of the contact person';
COMMENT ON COLUMN customers.pincode IS 'Postal code / PIN code for the address';
COMMENT ON COLUMN customers.company_size IS 'Size of the company: small, medium, large, enterprise';
