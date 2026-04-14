-- Migration 007: Enhance Followups System
-- Add customer relation, whatsapp reminder support, and "others" category

-- Add customer_id column to followups table
ALTER TABLE followups ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;

-- Add index for customer_id
CREATE INDEX IF NOT EXISTS idx_followups_customer ON followups(customer_id);

-- Add reminder_sent flag for tracking WhatsApp reminders
ALTER TABLE followups ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Add admin_whatsapp_phone column to store the admin's WhatsApp number who will receive the reminder
ALTER TABLE followups ADD COLUMN IF NOT EXISTS admin_whatsapp_phone VARCHAR(20);

-- Update followup_type to support whatsapp_reminder
-- Existing types: call, email, meeting, demo
-- New type: whatsapp_reminder (sends reminder to admin's WhatsApp)
-- Note: This is a comment for developers - PostgreSQL VARCHAR doesn't enforce enum

-- Modify constraint to allow NULL for all relations (for "others" type followups)
-- Already nullable in original schema, no change needed

-- Add comments for documentation
COMMENT ON COLUMN followups.customer_id IS 'Reference to customer (alternative to opportunity/lead)';
COMMENT ON COLUMN followups.reminder_sent IS 'Flag indicating if WhatsApp reminder was sent to admin';
COMMENT ON COLUMN followups.admin_whatsapp_phone IS 'Admin WhatsApp number to receive reminder (from WhatsApp conversation context)';

-- Create view for pending WhatsApp reminders (sent to admin who created the followup)
CREATE OR REPLACE VIEW pending_whatsapp_reminders AS
SELECT 
    f.id,
    f.customer_id,
    f.opportunity_id,
    f.lead_id,
    f.assigned_to,
    f.followup_date,
    f.followup_type,
    f.notes,
    f.admin_whatsapp_phone,
    f.admin_whatsapp_phone as target_phone,  -- Send to admin, not customer
    c.company_name as customer_name,
    o.title as opportunity_title,
    l.name as lead_name,
    u.full_name as assigned_to_name
FROM followups f
LEFT JOIN customers c ON f.customer_id = c.id
LEFT JOIN opportunities o ON f.opportunity_id = o.id
LEFT JOIN leads l ON f.lead_id = l.id
LEFT JOIN users u ON f.assigned_to = u.id
WHERE f.followup_type = 'whatsapp_reminder'
  AND f.status = 'pending'
  AND f.reminder_sent = FALSE
  AND f.admin_whatsapp_phone IS NOT NULL  -- Must have admin phone
  AND f.followup_date <= CURRENT_TIMESTAMP + INTERVAL '5 minutes'  -- Send 5 mins before or after
ORDER BY f.followup_date ASC;

COMMENT ON VIEW pending_whatsapp_reminders IS 'View of upcoming WhatsApp reminders to be sent to admin users';
