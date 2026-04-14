const pool = require('../config/database');
const { sendWhatsAppMessage } = require('../utils/whatsappSender');

/**
 * WhatsApp Reminder Scheduler Service
 * Checks for pending WhatsApp reminders and sends them when due
 * Falls back to business WhatsApp number if admin phone not set
 */

// Default WhatsApp number (business chatbot number)
const DEFAULT_WHATSAPP_NUMBER = process.env.DEFAULT_ADMIN_WHATSAPP || '15551646700'; // +1 (555) 164-6700

// Fetch WhatsApp credentials from database
const getWhatsAppCredentials = async () => {
  const result = await pool.query(
    'SELECT phone_number_id, access_token FROM whatsapp_config WHERE is_active = true LIMIT 1'
  );
  if (result.rows.length === 0) {
    throw new Error('WhatsApp not configured');
  }
  return result.rows[0];
};

const processWhatsAppReminders = async () => {
  try {
    console.log('[WhatsApp Scheduler] Checking for pending reminders...');
    
    // Get WhatsApp credentials from database
    const credentials = await getWhatsAppCredentials();
    
    // Get pending WhatsApp reminders - don't filter by admin_whatsapp_phone
    // We'll use fallback for reminders without it
    // Note: followup_date is stored as local time (IST), so we compare against IST time
    const result = await pool.query(`
      SELECT f.id, f.customer_id, f.opportunity_id, f.lead_id,
             f.assigned_to, f.followup_date, f.followup_type,
             f.notes, f.admin_whatsapp_phone,
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
        AND f.followup_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::timestamp + INTERVAL '5 minutes'
      ORDER BY f.followup_date ASC
      LIMIT 50
    `);
    
    if (result.rows.length === 0) {
      console.log('[WhatsApp Scheduler] No pending reminders');
      return;
    }
    
    console.log(`[WhatsApp Scheduler] Found ${result.rows.length} pending reminders`);
    
    for (const reminder of result.rows) {
      try {
        // Build reminder message
        const message = buildReminderMessage(reminder);
        
        // Use admin WhatsApp phone if set, otherwise use default business number
        const targetPhone = reminder.admin_whatsapp_phone || DEFAULT_WHATSAPP_NUMBER;
        const phoneSource = reminder.admin_whatsapp_phone ? 'admin phone' : 'default business number';
        
        // Send WhatsApp message to ADMIN (not customer)
        await sendWhatsAppMessage(credentials.phone_number_id, credentials.access_token, targetPhone, message);
        console.log(`[WhatsApp Scheduler] Sent reminder to ${phoneSource}: ${targetPhone}`);
        
        // Mark as sent
        await pool.query(
          `UPDATE followups 
           SET reminder_sent = TRUE
           WHERE id = $1`,
          [reminder.id]
        );
      } catch (error) {
        console.error(`[WhatsApp Scheduler] Error sending reminder ${reminder.id}:`, error);
        
        // Mark as failed
        await pool.query(
          `UPDATE followups 
           SET reminder_sent = TRUE, 
               status = 'missed',
               notes = CONCAT(COALESCE(notes, ''), ' [Failed: ', $2, ']')
           WHERE id = $1`,
          [reminder.id, error.message.substring(0, 100)]
        );
      }
    }
  } catch (error) {
    console.error('[WhatsApp Scheduler] Error processing reminders:', error);
  }
};

const buildReminderMessage = (reminder) => {
  const lines = [];
  
  lines.push('🔔 *Follow-up Reminder*');
  lines.push('');
  
  // Show what/who they need to follow up with
  if (reminder.customer_name) {
    lines.push(`📋 Follow up with: *${reminder.customer_name}*`);
  } else if (reminder.opportunity_title) {
    lines.push(`📋 Follow up on: *${reminder.opportunity_title}*`);
  } else if (reminder.lead_name) {
    lines.push(`📋 Follow up with: *${reminder.lead_name}*`);
  }
  
  if (reminder.notes) {
    lines.push(`\n💬 Notes: ${reminder.notes}`);
  }
  
  const followupDate = new Date(reminder.followup_date);
  const now = new Date();
  const isPast = followupDate < now;
  
  lines.push(`\n⏰ ${isPast ? 'Was scheduled for' : 'Scheduled for'}: ${followupDate.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  })}`);
  
  if (reminder.assigned_to_name) {
    lines.push(`👤 Assigned to: ${reminder.assigned_to_name}`);
  }
  
  lines.push('');
  lines.push('_Reply with updates or type "done" to mark complete_');
  
  return lines.join('\n');
};

module.exports = {
  processWhatsAppReminders
};
