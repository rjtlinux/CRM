-- Enterprise CRM Database Schema
-- PostgreSQL 14+

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS proposal_items CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS costs CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales table
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    sale_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    invoice_number VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Costs table
CREATE TABLE costs (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    cost_date DATE NOT NULL,
    vendor VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending',
    receipt_number VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proposals table
CREATE TABLE proposals (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    proposal_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    valid_until DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proposal items table
CREATE TABLE proposal_items (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_costs_date ON costs(cost_date);
CREATE INDEX idx_costs_category ON costs(category);
CREATE INDEX idx_proposals_customer_id ON proposals(customer_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposal_items_proposal_id ON proposal_items(proposal_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_costs_updated_at BEFORE UPDATE ON costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- Note: This is a bcrypt hash of 'admin123'
INSERT INTO users (email, password, full_name, role) VALUES
('admin@crm.com', '$2a$10$VSKImIlx7L7hjBrzetXIfO9h1wIaj2k7NjcSSG5ysqciCRMhy2da2', 'Admin User', 'admin');

-- Insert sample data for demonstration
INSERT INTO customers (company_name, contact_person, email, phone, city, country, created_by) VALUES
('Tech Solutions Inc', 'John Doe', 'john@techsolutions.com', '+1-555-0101', 'New York', 'USA', 1),
('Global Enterprises', 'Jane Smith', 'jane@globalent.com', '+1-555-0102', 'Los Angeles', 'USA', 1),
('Innovation Corp', 'Bob Johnson', 'bob@innovation.com', '+1-555-0103', 'Chicago', 'USA', 1);

INSERT INTO sales (customer_id, sale_date, amount, description, status, payment_method, invoice_number, created_by) VALUES
(1, '2026-01-10', 15000.00, 'CRM Software License', 'completed', 'credit_card', 'INV-2026-001', 1),
(2, '2026-01-08', 25000.00, 'Enterprise Package', 'completed', 'bank_transfer', 'INV-2026-002', 1),
(3, '2026-01-12', 10000.00, 'Consulting Services', 'pending', 'invoice', 'INV-2026-003', 1),
(1, '2025-12-15', 12000.00, 'Annual Subscription', 'completed', 'credit_card', 'INV-2025-045', 1),
(2, '2025-12-20', 18000.00, 'Professional Services', 'completed', 'bank_transfer', 'INV-2025-046', 1);

INSERT INTO costs (category, description, amount, cost_date, vendor, payment_status, created_by) VALUES
('Software', 'Cloud Hosting - AWS', 5000.00, '2026-01-01', 'Amazon Web Services', 'paid', 1),
('Marketing', 'Digital Advertising', 3000.00, '2026-01-05', 'Google Ads', 'paid', 1),
('Operations', 'Office Supplies', 500.00, '2026-01-10', 'Office Depot', 'pending', 1),
('Salaries', 'Employee Salaries', 45000.00, '2026-01-01', 'Internal', 'paid', 1),
('Software', 'Development Tools', 2000.00, '2025-12-28', 'Various Vendors', 'paid', 1);

INSERT INTO proposals (customer_id, proposal_number, title, description, total_amount, status, valid_until, created_by) VALUES
(1, 'PROP-2026-001', 'CRM System Upgrade', 'Comprehensive CRM system upgrade with advanced analytics', 35000.00, 'sent', '2026-02-15', 1),
(3, 'PROP-2026-002', 'Consulting Package', 'Six-month consulting and implementation package', 50000.00, 'draft', '2026-01-31', 1);

INSERT INTO proposal_items (proposal_id, item_name, description, quantity, unit_price, total_price) VALUES
(1, 'CRM Premium License', 'Annual license for 50 users', 1, 25000.00, 25000.00),
(1, 'Implementation Services', 'Setup and configuration', 40, 250.00, 10000.00),
(2, 'Consulting Hours', 'Expert consulting services', 200, 250.00, 50000.00);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
