const pool = require('../config/database');
const { sendWhatsAppMessage } = require('../utils/whatsappSender');

/**
 * WhatsApp Reminder Scheduler Service
 * Checks for pending WhatsApp reminders and sends them when due
 */

const processWhatsAppReminders = async () => {
  try {
    console.log('[WhatsApp Scheduler] Checking for pending reminders...');
    
    // Get pending WhatsApp reminders from view
    const result = await pool.query(`
      SELECT * FROM pending_whatsapp_reminders
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
        
        // Send WhatsApp message to ADMIN (not customer)
        if (reminder.target_phone) {
          await sendWhatsAppMessage(reminder.target_phone, message);
          console.log(`[WhatsApp Scheduler] Sent reminder to admin at ${reminder.target_phone}`);
          
          // Mark as sent
          await pool.query(
            `UPDATE followups 
             SET reminder_sent = TRUE
             WHERE id = $1`,
            [reminder.id]
          );
        } else {
          console.warn(`[WhatsApp Scheduler] No admin WhatsApp number for reminder ${reminder.id}`);
          
          // Mark as failed (no phone number)
          await pool.query(
            `UPDATE followups 
             SET reminder_sent = TRUE, 
                 status = 'missed',
                 notes = CONCAT(COALESCE(notes, ''), ' [Failed: No admin WhatsApp number]')
             WHERE id = $1`,
            [reminder.id]
          );
        }
      } catch (error) {
        console.error(`[WhatsApp Scheduler] Error sending reminder ${reminder.id}:`, error);
        
        // Mark as failed
        await pool.query(
          `UPDATE followups 
           SET reminder_sent = TRUE, 
               status = 'missed',
               notes = CONCAT(notes, ' [Failed: ', $2, ']')
           WHERE id = $1`,COALESCE(notes, '')
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
