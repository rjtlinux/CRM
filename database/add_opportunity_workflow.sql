-- Transform Opportunities into Ticket-like Workflow System
-- Add fields for tracking, comments, and activity

-- Add workflow tracking fields
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS next_followup_date DATE,
ADD COLUMN IF NOT EXISTS last_contact_date DATE,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create opportunity_activities table for tracking all changes and comments
CREATE TABLE IF NOT EXISTS opportunity_activities (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL, -- 'comment', 'status_change', 'stage_change', 'follow_up', 'call', 'email', 'meeting'
    description TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create opportunity_comments table for discussion/notes
CREATE TABLE IF NOT EXISTS opportunity_comments (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- internal notes vs customer-facing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create opportunity_attachments table for files/documents
CREATE TABLE IF NOT EXISTS opportunity_attachments (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_opportunities_next_followup ON opportunities(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_opportunity_activities_opp_id ON opportunity_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_activities_created ON opportunity_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunity_comments_opp_id ON opportunity_comments(opportunity_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_opportunity_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_opportunity_comments_updated_at
    BEFORE UPDATE ON opportunity_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunity_comments_updated_at();

-- Add comments to explain the schema
COMMENT ON COLUMN opportunities.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN opportunities.next_followup_date IS 'Next scheduled follow-up date';
COMMENT ON COLUMN opportunities.last_contact_date IS 'Last time contact was made';
COMMENT ON COLUMN opportunities.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN opportunities.notes IS 'Internal notes about the opportunity';

COMMENT ON TABLE opportunity_activities IS 'Activity log for all changes and interactions';
COMMENT ON TABLE opportunity_comments IS 'Comments and discussion on opportunities';
COMMENT ON TABLE opportunity_attachments IS 'Files and documents attached to opportunities';

-- Insert sample activity for existing opportunities (if any)
INSERT INTO opportunity_activities (opportunity_id, user_id, activity_type, description, created_at)
SELECT id, assigned_to, 'created', 'Opportunity created', created_at
FROM opportunities
WHERE NOT EXISTS (
    SELECT 1 FROM opportunity_activities WHERE opportunity_id = opportunities.id
);
