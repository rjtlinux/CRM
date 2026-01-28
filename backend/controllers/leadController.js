const pool = require('../config/database');

const getAllLeads = async (req, res) => {
  try {
    const { status, assigned_to } = req.query;
    let query = `
      SELECT l.*, u.full_name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE 1=1
    `;
    
    const params = [];
    if (status) {
      params.push(status);
      query += ` AND l.status = $${params.length}`;
    }
    if (assigned_to) {
      params.push(assigned_to);
      query += ` AND l.assigned_to = $${params.length}`;
    }
    
    query += ' ORDER BY l.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ leads: result.rows });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT l.*, u.full_name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ lead: result.rows[0] });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createLead = async (req, res) => {
  try {
    const { name, email, phone, company, position, status, lead_source, assigned_to, notes } = req.body;
    
    const result = await pool.query(
      `INSERT INTO leads 
       (name, email, phone, company, position, status, lead_source, assigned_to, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, email, phone, company, position, status, lead_source, assigned_to, notes, req.user.id]
    );
    
    // Log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'lead', $2, 'created', $3)`,
      [req.user.id, result.rows[0].id, `Created lead: ${name}`]
    );
    
    res.status(201).json({ 
      message: 'Lead created successfully',
      lead: result.rows[0] 
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, position, status, lead_source, assigned_to, notes } = req.body;
    
    // Get old status for tracking
    const oldData = await pool.query('SELECT status FROM leads WHERE id = $1', [id]);
    const oldStatus = oldData.rows[0]?.status;
    
    const result = await pool.query(
      `UPDATE leads 
       SET name = $1, email = $2, phone = $3, company = $4, position = $5,
           status = $6, lead_source = $7, assigned_to = $8, notes = $9
       WHERE id = $10
       RETURNING *`,
      [name, email, phone, company, position, status, lead_source, assigned_to, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Track status change
    if (oldStatus && oldStatus !== status) {
      await pool.query(
        `INSERT INTO conversion_tracking 
         (lead_id, stage_from, stage_to, created_by)
         VALUES ($1, $2, $3, $4)`,
        [id, oldStatus, status, req.user.id]
      );
      
      await pool.query(
        `INSERT INTO activity_log (user_id, entity_type, entity_id, action, description)
         VALUES ($1, 'lead', $2, 'status_changed', $3)`,
        [req.user.id, id, `Status changed from ${oldStatus} to ${status}`]
      );
    }
    
    res.json({ 
      message: 'Lead updated successfully',
      lead: result.rows[0] 
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getLeadMetrics = async (req, res) => {
  try {
    // Total and active leads
    const totals = await pool.query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status IN ('new', 'contacted', 'qualified') THEN 1 END) as active_leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
        COUNT(CASE WHEN status = 'unqualified' THEN 1 END) as unqualified_leads
      FROM leads
    `);
    
    // Leads by status
    const byStatus = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM leads
      GROUP BY status
      ORDER BY count DESC
    `);
    
    // Leads by salesperson
    const bySalesperson = await pool.query(`
      SELECT 
        u.full_name as salesperson,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_count,
        COUNT(CASE WHEN l.status IN ('new', 'contacted', 'qualified') THEN 1 END) as active_count
      FROM users u
      LEFT JOIN leads l ON l.assigned_to = u.id
      GROUP BY u.id, u.full_name
      ORDER BY lead_count DESC
    `);
    
    // Conversion rate
    const conversionRate = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'converted' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100 as conversion_rate
      FROM leads
      WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
    `);
    
    res.json({
      totals: totals.rows[0],
      by_status: byStatus.rows,
      by_salesperson: bySalesperson.rows,
      conversion_rate: conversionRate.rows[0]?.conversion_rate || 0
    });
  } catch (error) {
    console.error('Get lead metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadMetrics
};
