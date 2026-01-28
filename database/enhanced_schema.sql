-- Enhanced CRM Schema with New Features
-- Run this after the base schema.sql to add new features

-- Add opportunities/deals table
CREATE TABLE IF NOT EXISTS opportunities (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(15, 2) NOT NULL,
    pipeline_stage VARCHAR(50) DEFAULT 'lead', -- lead, qualified, proposal, negotiation, closed_won, closed_lost
    closing_probability INTEGER DEFAULT 50, -- 0-100%
    expected_close_date DATE,
    assigned_to INTEGER REFERENCES users(id),
    source VARCHAR(100), -- website, referral, cold_call, etc
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add leads table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    position VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, unqualified, converted
    lead_source VARCHAR(100),
    assigned_to INTEGER REFERENCES users(id),
    converted_to_customer_id INTEGER REFERENCES customers(id),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add follow-ups table
CREATE TABLE IF NOT EXISTS followups (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES users(id),
    followup_date TIMESTAMP NOT NULL,
    followup_type VARCHAR(50), -- call, email, meeting, demo
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, missed, rescheduled
    notes TEXT,
    completed_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add conversion tracking table
CREATE TABLE IF NOT EXISTS conversion_tracking (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    opportunity_id INTEGER REFERENCES opportunities(id),
    stage_from VARCHAR(50),
    stage_to VARCHAR(50),
    conversion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    days_in_stage INTEGER,
    notes TEXT,
    ai_analysis TEXT, -- AI-generated insights for non-conversion
    created_by INTEGER REFERENCES users(id)
);

-- Add reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    related_to VARCHAR(50), -- opportunity, lead, followup
    related_id INTEGER,
    reminder_type VARCHAR(50), -- followup, deadline, task
    reminder_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, dismissed
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    entity_type VARCHAR(50), -- opportunity, lead, customer, sale
    entity_id INTEGER,
    action VARCHAR(100), -- created, updated, stage_changed, email_sent, call_made
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extend users table with role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_type VARCHAR(50) DEFAULT 'sales'; -- admin, manager, sales

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned ON opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_closing_date ON opportunities(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_followups_assigned ON followups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_followups_date ON followups(followup_date);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);

-- Create triggers for updated_at
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_followups_updated_at BEFORE UPDATE ON followups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample opportunities data
INSERT INTO opportunities (customer_id, title, description, value, pipeline_stage, closing_probability, expected_close_date, assigned_to, source, created_by) VALUES
(1, 'Enterprise CRM Upgrade', 'Upgrade to premium package with 100 users', 45000.00, 'proposal', 75, CURRENT_DATE + INTERVAL '15 days', 1, 'referral', 1),
(2, 'Annual Support Contract', 'Yearly support and maintenance contract', 28000.00, 'negotiation', 85, CURRENT_DATE + INTERVAL '10 days', 1, 'existing_customer', 1),
(3, 'New Implementation', 'Fresh CRM implementation for 50 users', 35000.00, 'qualified', 60, CURRENT_DATE + INTERVAL '30 days', 1, 'website', 1),
(1, 'Training Package', 'Advanced user training for 20 employees', 8000.00, 'lead', 40, CURRENT_DATE + INTERVAL '45 days', 1, 'inbound', 1);

-- Insert sample leads data
INSERT INTO leads (name, email, phone, company, position, status, lead_source, assigned_to, notes, created_by) VALUES
('Sarah Johnson', 'sarah@techcorp.com', '+1-555-0201', 'TechCorp Solutions', 'VP Sales', 'contacted', 'website', 1, 'Interested in enterprise plan', 1),
('Michael Brown', 'mbrown@startup.io', '+1-555-0202', 'StartupIO', 'Founder', 'qualified', 'referral', 1, 'Fast-growing startup, high priority', 1),
('Emily Davis', 'emily@consulting.com', '+1-555-0203', 'Davis Consulting', 'Managing Partner', 'new', 'cold_call', 1, 'Initial contact made', 1),
('Robert Wilson', 'rwilson@retail.com', '+1-555-0204', 'Retail Plus', 'IT Director', 'contacted', 'conference', 1, 'Met at tech conference', 1),
('Lisa Anderson', 'lisa@finance.com', '+1-555-0205', 'Finance Group', 'CFO', 'unqualified', 'linkedin', 1, 'Budget not approved for this year', 1);

-- Insert sample follow-ups
INSERT INTO followups (opportunity_id, assigned_to, followup_date, followup_type, status, notes, created_by) VALUES
(1, 1, CURRENT_TIMESTAMP + INTERVAL '2 days', 'call', 'pending', 'Follow up on proposal discussion', 1),
(2, 1, CURRENT_TIMESTAMP + INTERVAL '1 day', 'email', 'pending', 'Send contract for review', 1),
(3, 1, CURRENT_TIMESTAMP + INTERVAL '5 days', 'meeting', 'pending', 'Product demo scheduled', 1);

INSERT INTO followups (lead_id, assigned_to, followup_date, followup_type, status, notes, created_by) VALUES
(1, 1, CURRENT_TIMESTAMP + INTERVAL '1 day', 'call', 'pending', 'Discuss pricing options', 1),
(2, 1, CURRENT_TIMESTAMP + INTERVAL '3 days', 'demo', 'pending', 'Product demonstration', 1),
(4, 1, CURRENT_TIMESTAMP + INTERVAL '7 days', 'email', 'pending', 'Send case studies', 1);

-- Insert sample reminders
INSERT INTO reminders (user_id, related_to, related_id, reminder_type, reminder_date, message) VALUES
(1, 'followup', 1, 'followup', CURRENT_TIMESTAMP + INTERVAL '2 days', 'Follow up call with Tech Solutions Inc'),
(1, 'followup', 2, 'followup', CURRENT_TIMESTAMP + INTERVAL '1 day', 'Send contract to Global Enterprises'),
(1, 'opportunity', 1, 'deadline', CURRENT_DATE + INTERVAL '15 days', 'Enterprise CRM Upgrade closing soon');

-- Insert sample conversion tracking
INSERT INTO conversion_tracking (lead_id, stage_from, stage_to, days_in_stage, notes, created_by) VALUES
(2, 'contacted', 'qualified', 5, 'Moved to qualified after positive response', 1),
(5, 'contacted', 'unqualified', 7, 'Budget constraints - not a fit for this fiscal year', 1);

-- Insert sample activity log
INSERT INTO activity_log (user_id, entity_type, entity_id, action, description) VALUES
(1, 'opportunity', 1, 'created', 'Created new opportunity: Enterprise CRM Upgrade'),
(1, 'lead', 1, 'stage_changed', 'Lead status changed from new to contacted'),
(1, 'opportunity', 2, 'stage_changed', 'Opportunity moved to negotiation stage'),
(1, 'followup', 1, 'created', 'Scheduled follow-up call');

-- Create views for common queries

-- Opportunities pipeline view
CREATE OR REPLACE VIEW opportunities_pipeline AS
SELECT 
    o.*,
    c.company_name as customer_name,
    u.full_name as assigned_to_name,
    CASE 
        WHEN o.expected_close_date < CURRENT_DATE THEN 'overdue'
        WHEN o.expected_close_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
        ELSE 'on_track'
    END as urgency_status
FROM opportunities o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN users u ON o.assigned_to = u.id;

-- Sales funnel metrics view
CREATE OR REPLACE VIEW sales_funnel_metrics AS
SELECT 
    pipeline_stage,
    COUNT(*) as count,
    SUM(value) as total_value,
    AVG(closing_probability) as avg_probability,
    AVG(value) as avg_deal_size
FROM opportunities
WHERE pipeline_stage NOT IN ('closed_lost')
GROUP BY pipeline_stage;

-- Missed follow-ups view
CREATE OR REPLACE VIEW missed_followups AS
SELECT 
    f.*,
    u.full_name as assigned_to_name,
    COALESCE(o.title, l.name) as related_to_name
FROM followups f
LEFT JOIN users u ON f.assigned_to = u.id
LEFT JOIN opportunities o ON f.opportunity_id = o.id
LEFT JOIN leads l ON f.lead_id = l.id
WHERE f.status = 'pending' 
  AND f.followup_date < CURRENT_TIMESTAMP;

COMMENT ON TABLE opportunities IS 'Tracks sales opportunities through the pipeline';
COMMENT ON TABLE leads IS 'Tracks potential customers before conversion';
COMMENT ON TABLE followups IS 'Scheduled follow-up activities';
COMMENT ON TABLE reminders IS 'User reminders for important dates and tasks';
COMMENT ON TABLE conversion_tracking IS 'Tracks conversion stages and reasons';
COMMENT ON TABLE activity_log IS 'Audit log of all user activities';
