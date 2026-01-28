const pool = require('../config/database');

const getAllFollowups = async (req, res) => {
  try {
    const { status, assigned_to } = req.query;
    let query = `
      SELECT f.*,
             u.full_name as assigned_to_name,
             COALESCE(o.title, l.name) as related_to_name,
             CASE WHEN f.opportunity_id IS NOT NULL THEN 'opportunity' ELSE 'lead' END as related_type
      FROM followups f
      LEFT JOIN users u ON f.assigned_to = u.id
      LEFT JOIN opportunities o ON f.opportunity_id = o.id
      LEFT JOIN leads l ON f.lead_id = l.id
      WHERE 1=1
    `;
    
    const params = [];
    if (status) {
      params.push(status);
      query += ` AND f.status = $${params.length}`;
    }
    if (assigned_to) {
      params.push(assigned_to);
      query += ` AND f.assigned_to = $${params.length}`;
    }
    
    query += ' ORDER BY f.followup_date ASC';
    
    const result = await pool.query(query, params);
    res.json({ followups: result.rows });
  } catch (error) {
    console.error('Get followups error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getMissedFollowups = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*,
             u.full_name as assigned_to_name,
             COALESCE(o.title, l.name) as related_to_name,
             CASE WHEN f.opportunity_id IS NOT NULL THEN 'opportunity' ELSE 'lead' END as related_type
      FROM followups f
      LEFT JOIN users u ON f.assigned_to = u.id
      LEFT JOIN opportunities o ON f.opportunity_id = o.id
      LEFT JOIN leads l ON f.lead_id = l.id
      WHERE f.status = 'pending' 
        AND f.followup_date < CURRENT_TIMESTAMP
      ORDER BY f.followup_date ASC
    `);
    
    res.json({ missed_followups: result.rows });
  } catch (error) {
    console.error('Get missed followups error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUpcomingFollowups = async (req, res) => {
  try {
    const days = req.query.days || 7;
    const result = await pool.query(`
      SELECT f.*,
             u.full_name as assigned_to_name,
             COALESCE(o.title, l.name) as related_to_name,
             CASE WHEN f.opportunity_id IS NOT NULL THEN 'opportunity' ELSE 'lead' END as related_type
      FROM followups f
      LEFT JOIN users u ON f.assigned_to = u.id
      LEFT JOIN opportunities o ON f.opportunity_id = o.id
      LEFT JOIN leads l ON f.lead_id = l.id
      WHERE f.status = 'pending' 
        AND f.followup_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '${days} days'
      ORDER BY f.followup_date ASC
    `);
    
    res.json({ upcoming_followups: result.rows });
  } catch (error) {
    console.error('Get upcoming followups error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createFollowup = async (req, res) => {
  try {
    const {
      opportunity_id, lead_id, assigned_to, followup_date,
      followup_type, status, notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO followups 
       (opportunity_id, lead_id, assigned_to, followup_date, followup_type, status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [opportunity_id, lead_id, assigned_to, followup_date, followup_type, status, notes, req.user.id]
    );
    
    // Create reminder
    await pool.query(
      `INSERT INTO reminders (user_id, related_to, related_id, reminder_type, reminder_date, message)
       VALUES ($1, 'followup', $2, 'followup', $3, $4)`,
      [assigned_to, result.rows[0].id, followup_date, `Follow-up: ${followup_type}`]
    );
    
    res.status(201).json({ 
      message: 'Follow-up created successfully',
      followup: result.rows[0] 
    });
  } catch (error) {
    console.error('Create followup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, followup_date, followup_type, status, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE followups 
       SET assigned_to = $1, followup_date = $2, followup_type = $3, 
           status = $4, notes = $5,
           completed_at = CASE WHEN $4 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $6
       RETURNING *`,
      [assigned_to, followup_date, followup_type, status, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }
    
    // Mark as missed if status changed to missed
    if (status === 'missed') {
      await pool.query(
        `INSERT INTO activity_log (user_id, entity_type, entity_id, action, description)
         VALUES ($1, 'followup', $2, 'missed', 'Follow-up was missed')`,
        [req.user.id, id]
      );
    }
    
    res.json({ 
      message: 'Follow-up updated successfully',
      followup: result.rows[0] 
    });
  } catch (error) {
    console.error('Update followup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM followups WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }
    
    res.json({ message: 'Follow-up deleted successfully' });
  } catch (error) {
    console.error('Delete followup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllFollowups,
  getMissedFollowups,
  getUpcomingFollowups,
  createFollowup,
  updateFollowup,
  deleteFollowup
};
