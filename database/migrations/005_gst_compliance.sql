-- GST Compliance Migration
-- Adds full GST support for Indian businesses

-- 1. Add GSTIN to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS gstin VARCHAR(15),
ADD COLUMN IF NOT EXISTS gst_state VARCHAR(50),
ADD COLUMN IF NOT EXISTS gst_registration_type VARCHAR(20) DEFAULT 'regular' CHECK (gst_registration_type IN ('regular', 'composition', 'unregistered'));

-- 2. Create HSN/SAC codes table
CREATE TABLE IF NOT EXISTS hsn_sac_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('HSN', 'SAC')),
    gst_rate DECIMAL(5,2) NOT NULL CHECK (gst_rate IN (0, 0.25, 3, 5, 12, 18, 28)),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create GST rates configuration table
CREATE TABLE IF NOT EXISTS gst_rates (
    id SERIAL PRIMARY KEY,
    rate DECIMAL(5,2) NOT NULL UNIQUE CHECK (rate >= 0 AND rate <= 28),
    cgst DECIMAL(5,2) NOT NULL,
    sgst DECIMAL(5,2) NOT NULL,
    igst DECIMAL(5,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Add GST fields to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS total_gst DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(50),
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(20) DEFAULT 'B2B' CHECK (invoice_type IN ('B2B', 'B2C', 'Export', 'SEZ'));

-- 5. Create GST invoices table (for detailed invoice storage)
CREATE TABLE IF NOT EXISTS gst_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    customer_gstin VARCHAR(15),
    customer_name VARCHAR(255) NOT NULL,
    customer_address TEXT,
    customer_state VARCHAR(50),
    
    -- Company details (from settings)
    company_gstin VARCHAR(15) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT,
    company_state VARCHAR(50),
    
    -- Invoice details
    invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('B2B', 'B2C', 'Export', 'SEZ')),
    place_of_supply VARCHAR(50) NOT NULL,
    reverse_charge BOOLEAN DEFAULT false,
    
    -- Amounts
    taxable_amount DECIMAL(15,2) NOT NULL,
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_amount DECIMAL(15,2) DEFAULT 0,
    total_gst DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Payment
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
    paid_amount DECIMAL(15,2) DEFAULT 0,
    
    -- References
    sale_id INTEGER REFERENCES sales(id),
    
    -- Metadata
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create GST invoice items table
CREATE TABLE IF NOT EXISTS gst_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL,
    
    -- Item details
    description TEXT NOT NULL,
    hsn_code VARCHAR(10) NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(20) DEFAULT 'NOS',
    rate DECIMAL(15,2) NOT NULL,
    
    -- Amounts
    taxable_amount DECIMAL(15,2) NOT NULL,
    gst_rate DECIMAL(5,2) NOT NULL,
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Insert standard GST rates
INSERT INTO gst_rates (rate, cgst, sgst, igst, description) VALUES
(0, 0, 0, 0, 'Nil Rate - Essential items'),
(0.25, 0.125, 0.125, 0.25, 'Ultra Low Rate - Precious stones'),
(3, 1.5, 1.5, 3, 'Low Rate - Gold, Silver'),
(5, 2.5, 2.5, 5, 'Low Rate - Essential goods'),
(12, 6, 6, 12, 'Standard Rate - Common goods'),
(18, 9, 9, 18, 'Standard Rate - Most services'),
(28, 14, 14, 28, 'High Rate - Luxury items')
ON CONFLICT (rate) DO NOTHING;

-- 8. Insert common HSN/SAC codes
INSERT INTO hsn_sac_codes (code, description, type, gst_rate, category) VALUES
-- Common Goods (HSN)
('1001', 'Wheat and meslin', 'HSN', 0, 'Agriculture'),
('1006', 'Rice', 'HSN', 5, 'Agriculture'),
('0901', 'Coffee', 'HSN', 5, 'Agriculture'),
('2710', 'Petroleum oils', 'HSN', 18, 'Fuel'),
('8517', 'Mobile phones', 'HSN', 18, 'Electronics'),
('8471', 'Computers and laptops', 'HSN', 18, 'Electronics'),
('6403', 'Footwear', 'HSN', 12, 'Clothing'),
('6109', 'T-shirts', 'HSN', 5, 'Clothing'),
('7113', 'Jewellery', 'HSN', 3, 'Luxury'),
('8703', 'Motor cars', 'HSN', 28, 'Vehicles'),

-- Common Services (SAC)
('995411', 'Accounting and bookkeeping', 'SAC', 18, 'Professional'),
('998313', 'Advertising services', 'SAC', 18, 'Professional'),
('995424', 'Consulting services', 'SAC', 18, 'Professional'),
('998212', 'Information technology services', 'SAC', 18, 'IT'),
('996511', 'Restaurant services', 'SAC', 5, 'Food'),
('996711', 'Hotel services', 'SAC', 12, 'Hospitality'),
('996419', 'Transport services', 'SAC', 5, 'Transport'),
('997212', 'Legal services', 'SAC', 18, 'Professional'),
('996721', 'Construction services', 'SAC', 18, 'Construction'),
('998314', 'E-commerce services', 'SAC', 18, 'IT')
ON CONFLICT (code) DO NOTHING;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers(gstin);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_invoice_number ON gst_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_customer ON gst_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_date ON gst_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_gst_invoice_items_invoice ON gst_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_hsn_sac_codes_code ON hsn_sac_codes(code);
CREATE INDEX IF NOT EXISTS idx_sales_hsn_code ON sales(hsn_code);

-- 10. Create view for GST summary
CREATE OR REPLACE VIEW gst_sales_summary AS
SELECT 
    DATE_TRUNC('month', s.created_at) as month,
    s.customer_id,
    c.company_name,
    c.gstin,
    SUM(s.taxable_amount) as total_taxable,
    SUM(s.cgst_amount) as total_cgst,
    SUM(s.sgst_amount) as total_sgst,
    SUM(s.igst_amount) as total_igst,
    SUM(s.total_gst) as total_gst,
    SUM(s.amount) as total_amount,
    COUNT(*) as invoice_count
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
WHERE s.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', s.created_at), s.customer_id, c.company_name, c.gstin;

-- 11. Create function to validate GSTIN
CREATE OR REPLACE FUNCTION validate_gstin(gstin_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- GSTIN format: 2 digits (state code) + 10 chars (PAN) + 1 digit (entity number) + 1 char (Z) + 1 check digit
    IF gstin_value IS NULL THEN
        RETURN TRUE; -- Allow NULL for unregistered
    END IF;
    
    IF LENGTH(gstin_value) != 15 THEN
        RETURN FALSE;
    END IF;
    
    -- Check if first 2 chars are digits (state code)
    IF NOT SUBSTRING(gstin_value FROM 1 FOR 2) ~ '^[0-9]{2}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if next 10 chars are alphanumeric (PAN format)
    IF NOT SUBSTRING(gstin_value FROM 3 FOR 10) ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if 13th char is digit
    IF NOT SUBSTRING(gstin_value FROM 13 FOR 1) ~ '^[0-9]$' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if 14th char is Z
    IF SUBSTRING(gstin_value FROM 14 FOR 1) != 'Z' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if 15th char is alphanumeric
    IF NOT SUBSTRING(gstin_value FROM 15 FOR 1) ~ '^[0-9A-Z]$' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 12. Add GSTIN validation constraint
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS check_valid_gstin;

ALTER TABLE customers 
ADD CONSTRAINT check_valid_gstin 
CHECK (validate_gstin(gstin));

-- 13. Create trigger to update GST amounts
CREATE OR REPLACE FUNCTION calculate_gst_amounts()
RETURNS TRIGGER AS $$
DECLARE
    customer_state TEXT;
    company_state TEXT;
    is_interstate BOOLEAN;
BEGIN
    -- Get customer state
    SELECT gst_state INTO customer_state FROM customers WHERE id = NEW.customer_id;
    
    -- Assume company state (should be from settings table)
    company_state := 'Maharashtra'; -- TODO: Get from company settings
    
    -- Determine if interstate
    is_interstate := (customer_state IS NULL OR customer_state != company_state);
    
    -- Calculate taxable amount
    NEW.taxable_amount := NEW.amount / (1 + (NEW.gst_rate / 100));
    NEW.total_gst := NEW.amount - NEW.taxable_amount;
    
    -- Calculate CGST/SGST (intrastate) or IGST (interstate)
    IF is_interstate THEN
        NEW.igst_amount := NEW.total_gst;
        NEW.cgst_amount := 0;
        NEW.sgst_amount := 0;
    ELSE
        NEW.igst_amount := 0;
        NEW.cgst_amount := NEW.total_gst / 2;
        NEW.sgst_amount := NEW.total_gst / 2;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if GST columns exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'gst_rate'
    ) THEN
        DROP TRIGGER IF EXISTS trigger_calculate_gst ON sales;
        CREATE TRIGGER trigger_calculate_gst
            BEFORE INSERT OR UPDATE OF amount, gst_rate
            ON sales
            FOR EACH ROW
            WHEN (NEW.gst_rate > 0)
            EXECUTE FUNCTION calculate_gst_amounts();
    END IF;
END $$;

-- 14. Create company settings table for GST details
CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) NOT NULL,
    pan VARCHAR(10),
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50) NOT NULL,
    pincode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    bank_name VARCHAR(255),
    bank_account VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_branch VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_company_gstin CHECK (validate_gstin(gstin))
);

-- Insert default company settings (user should update these)
INSERT INTO company_settings (
    company_name, gstin, address, state, phone, email
) VALUES (
    'Your Company Name',
    '27AAAAA0000A1Z5',
    'Your Company Address',
    'Maharashtra',
    '+91-1234567890',
    'info@yourcompany.com'
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE customers IS 'Customer table with GST compliance fields';
COMMENT ON TABLE hsn_sac_codes IS 'HSN (goods) and SAC (services) codes for GST';
COMMENT ON TABLE gst_rates IS 'Standard GST rates configuration';
COMMENT ON TABLE gst_invoices IS 'GST-compliant invoice master records';
COMMENT ON TABLE gst_invoice_items IS 'Line items for GST invoices';
COMMENT ON TABLE company_settings IS 'Company GST and business details';
