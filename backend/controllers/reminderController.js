const pool = require('../config/database');

const getUserReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT r.*,
             CASE 
               WHEN r.related_to = 'opportunity' THEN o.title
               WHEN r.related_to = 'lead' THEN l.name
               ELSE NULL
             END as related_name
      FROM reminders r
      LEFT JOIN opportunities o ON r.related_to = 'opportunity' AND r.related_id = o.id
      LEFT JOIN leads l ON r.related_to = 'lead' AND r.related_id = l.id
      WHERE r.user_id = $1
        AND r.status = 'pending'
        AND r.reminder_date <= CURRENT_TIMESTAMP + INTERVAL '7 days'
      ORDER BY r.reminder_date ASC
    `, [userId]);
    
    res.json({ reminders: result.rows });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getDueReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT r.*,
             CASE 
               WHEN r.related_to = 'opportunity' THEN o.title
               WHEN r.related_to = 'lead' THEN l.name
               ELSE NULL
             END as related_name
      FROM reminders r
      LEFT JOIN opportunities o ON r.related_to = 'opportunity' AND r.related_id = o.id
      LEFT JOIN leads l ON r.related_to = 'lead' AND r.related_id = l.id
      WHERE r.user_id = $1
        AND r.status = 'pending'
        AND r.reminder_date <= CURRENT_TIMESTAMP
      ORDER BY r.reminder_date ASC
    `, [userId]);
    
    res.json({ due_reminders: result.rows });
  } catch (error) {
    console.error('Get due reminders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createReminder = async (req, res) => {
  try {
    const { related_to, related_id, reminder_type, reminder_date, message } = req.body;
    
    const result = await pool.query(
      `INSERT INTO reminders (user_id, related_to, related_id, reminder_type, reminder_date, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, related_to, related_id, reminder_type, reminder_date, message]
    );
    
    res.status(201).json({ 
      message: 'Reminder created successfully',
      reminder: result.rows[0] 
    });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateReminderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const result = await pool.query(
      'UPDATE reminders SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [status, id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    
    res.json({ 
      message: 'Reminder updated successfully',
      reminder: result.rows[0] 
    });
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getUserReminders,
  getDueReminders,
  createReminder,
  updateReminderStatus,
  deleteReminder
};
