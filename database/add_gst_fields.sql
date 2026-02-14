-- Add GST fields to existing tables

-- Add GST fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS gstin VARCHAR(15),
ADD COLUMN IF NOT EXISTS gst_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS state_code VARCHAR(2);

-- Create GST rates master table
CREATE TABLE IF NOT EXISTS gst_rates (
  id SERIAL PRIMARY KEY,
  hsn_sac_code VARCHAR(10) NOT NULL,
  description VARCHAR(500),
  gst_rate DECIMAL(5,2) NOT NULL,
  cgst DECIMAL(5,2),
  sgst DECIMAL(5,2),
  igst DECIMAL(5,2),
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on HSN/SAC code
CREATE UNIQUE INDEX IF NOT EXISTS idx_gst_rates_hsn_sac ON gst_rates(hsn_sac_code);

-- Add GST fields to sales table
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS is_gst_invoice BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount_with_gst DECIMAL(12,2);

-- Create invoice items table for detailed GST invoices
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  hsn_sac_code VARCHAR(10),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'nos',
  rate_per_unit DECIMAL(12,2) NOT NULL,
  taxable_amount DECIMAL(12,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  cgst DECIMAL(12,2) DEFAULT 0,
  sgst DECIMAL(12,2) DEFAULT 0,
  igst DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on sale_id for faster queries
CREATE INDEX IF NOT EXISTS idx_invoice_items_sale_id ON invoice_items(sale_id);

-- Insert common GST rates
INSERT INTO gst_rates (hsn_sac_code, description, gst_rate, cgst, sgst, igst, category) VALUES
('2523', 'Portland Cement', 28.00, 14.00, 14.00, 28.00, 'Construction Materials'),
('7214', 'Iron & Steel Bars', 18.00, 9.00, 9.00, 18.00, 'Construction Materials'),
('3917', 'Plastic Pipes', 18.00, 9.00, 9.00, 18.00, 'Construction Materials'),
('8544', 'Electrical Wires', 18.00, 9.00, 9.00, 18.00, 'Electrical'),
('8536', 'Electrical Switches', 18.00, 9.00, 9.00, 18.00, 'Electrical'),
('8481', 'Taps and Valves', 18.00, 9.00, 9.00, 18.00, 'Plumbing'),
('3925', 'PVC Fittings', 18.00, 9.00, 9.00, 18.00, 'Plumbing'),
('6907', 'Ceramic Tiles', 18.00, 9.00, 9.00, 18.00, 'Construction Materials'),
('4407', 'Wood Products', 18.00, 9.00, 9.00, 18.00, 'Wood & Furniture'),
('7308', 'Steel Structures', 18.00, 9.00, 9.00, 18.00, 'Construction Materials'),
('2710', 'Paint', 18.00, 9.00, 9.00, 18.00, 'Paint & Chemicals'),
('6815', 'Readymade Concrete', 28.00, 14.00, 14.00, 28.00, 'Construction Materials'),
('998314', 'Labour Charges', 18.00, 9.00, 9.00, 18.00, 'Services'),
('995415', 'Transport Services', 5.00, 2.50, 2.50, 5.00, 'Services'),
('996511', 'Repair Services', 18.00, 9.00, 9.00, 18.00, 'Services')
ON CONFLICT (hsn_sac_code) DO NOTHING;

-- Add comments for clarity
COMMENT ON TABLE gst_rates IS 'Master table for GST rates with HSN/SAC codes';
COMMENT ON TABLE invoice_items IS 'Detailed line items for GST invoices';
COMMENT ON COLUMN customers.gstin IS 'GST Identification Number';
COMMENT ON COLUMN customers.gst_registered IS 'Whether customer is GST registered';
COMMENT ON COLUMN customers.state_code IS 'State code for GST (01-37)';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_gst_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gst_rates_updated_at
  BEFORE UPDATE ON gst_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_gst_updated_at();

CREATE TRIGGER update_invoice_items_updated_at
  BEFORE UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_gst_updated_at();

-- Display completion message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'GST Tables Created Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  - gst_rates (with 15 common HSN/SAC codes)';
  RAISE NOTICE '  - invoice_items';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns Added to:';
  RAISE NOTICE '  - customers (gstin, gst_registered, state_code)';
  RAISE NOTICE '  - sales (GST invoice fields)';
  RAISE NOTICE '========================================';
END $$;
