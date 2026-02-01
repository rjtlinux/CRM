-- Add sector column to customers table and make company_name unique
-- Migration script

-- Add sector column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS sector VARCHAR(100) DEFAULT 'Other';

-- Add unique constraint to company_name
ALTER TABLE customers 
ADD CONSTRAINT unique_company_name UNIQUE (company_name);

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_customers_sector ON customers(sector);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);

-- Update existing sample data with sectors
UPDATE customers SET sector = 'Technology' WHERE company_name LIKE '%Tech%' OR company_name LIKE '%Software%';
UPDATE customers SET sector = 'Manufacturing' WHERE company_name LIKE '%Manufacturing%' OR company_name LIKE '%Industries%';
UPDATE customers SET sector = 'Finance' WHERE company_name LIKE '%Financial%' OR company_name LIKE '%Bank%';
UPDATE customers SET sector = 'Retail' WHERE company_name LIKE '%Retail%' OR company_name LIKE '%Store%';

-- Make fields NOT NULL (except optional ones)
ALTER TABLE customers ALTER COLUMN company_name SET NOT NULL;
ALTER TABLE customers ALTER COLUMN contact_person SET NOT NULL;
ALTER TABLE customers ALTER COLUMN email SET NOT NULL;
ALTER TABLE customers ALTER COLUMN phone SET NOT NULL;
