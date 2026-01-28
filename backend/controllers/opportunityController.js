const pool = require('../config/database');

const getAllOpportunities = async (req, res) => {
  try {
    const { stage, assigned_to } = req.query;
    let query = `
      SELECT o.*, c.company_name as customer_name, u.full_name as assigned_to_name,
             CASE 
               WHEN o.expected_close_date < CURRENT_DATE THEN 'overdue'
               WHEN o.expected_close_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
               ELSE 'on_track'
             END as urgency_status
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.assigned_to = u.id
      WHERE 1=1
    `;
    
    const params = [];
    if (stage) {
      params.push(stage);
      query += ` AND o.pipeline_stage = $${params.length}`;
    }
    if (assigned_to) {
      params.push(assigned_to);
      query += ` AND o.assigned_to = $${params.length}`;
    }
    
    query += ' ORDER BY o.expected_close_date ASC, o.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ opportunities: result.rows });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getOpportunityById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT o.*, c.company_name as customer_name, c.email as customer_email,
             u.full_name as assigned_to_name
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.assigned_to = u.id
      WHERE o.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    res.json({ opportunity: result.rows[0] });
  } catch (error) {
    console.error('Get opportunity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createOpportunity = async (req, res) => {
  try {
    const {
      customer_id, title, description, value, pipeline_stage,
      closing_probability, expected_close_date, assigned_to, source
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO opportunities 
       (customer_id, title, description, value, pipeline_stage, closing_probability, 
        expected_close_date, assigned_to, source, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [customer_id, title, description, value, pipeline_stage, closing_probability,
       expected_close_date, assigned_to, source, req.user.id]
    );
    
    // Log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, entity_type, entity_id, action, description)
       VALUES ($1, 'opportunity', $2, 'created', $3)`,
      [req.user.id, result.rows[0].id, `Created opportunity: ${title}`]
    );
    
    res.status(201).json({ 
      message: 'Opportunity created successfully',
      opportunity: result.rows[0] 
    });
  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_id, title, description, value, pipeline_stage,
      closing_probability, expected_close_date, assigned_to
    } = req.body;
    
    // Get old stage for tracking
    const oldData = await pool.query('SELECT pipeline_stage FROM opportunities WHERE id = $1', [id]);
    const oldStage = oldData.rows[0]?.pipeline_stage;
    
    const result = await pool.query(
      `UPDATE opportunities 
       SET customer_id = $1, title = $2, description = $3, value = $4,
           pipeline_stage = $5, closing_probability = $6, expected_close_date = $7,
           assigned_to = $8
       WHERE id = $9
       RETURNING *`,
      [customer_id, title, description, value, pipeline_stage, closing_probability,
       expected_close_date, assigned_to, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    // Track stage change
    if (oldStage && oldStage !== pipeline_stage) {
      await pool.query(
        `INSERT INTO conversion_tracking 
         (opportunity_id, stage_from, stage_to, created_by)
         VALUES ($1, $2, $3, $4)`,
        [id, oldStage, pipeline_stage, req.user.id]
      );
      
      await pool.query(
        `INSERT INTO activity_log (user_id, entity_type, entity_id, action, description)
         VALUES ($1, 'opportunity', $2, 'stage_changed', $3)`,
        [req.user.id, id, `Stage changed from ${oldStage} to ${pipeline_stage}`]
      );
    }
    
    res.json({ 
      message: 'Opportunity updated successfully',
      opportunity: result.rows[0] 
    });
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM opportunities WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    res.json({ message: 'Opportunity deleted successfully' });
  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getPipelineMetrics = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pipeline_stage,
        COUNT(*) as count,
        SUM(value) as total_value,
        AVG(closing_probability) as avg_probability,
        AVG(value) as avg_deal_size
      FROM opportunities
      WHERE pipeline_stage NOT IN ('closed_lost')
      GROUP BY pipeline_stage
      ORDER BY 
        CASE pipeline_stage
          WHEN 'lead' THEN 1
          WHEN 'qualified' THEN 2
          WHEN 'proposal' THEN 3
          WHEN 'negotiation' THEN 4
          WHEN 'closed_won' THEN 5
          ELSE 6
        END
    `);
    
    res.json({ pipeline: result.rows });
  } catch (error) {
    console.error('Get pipeline metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getRevenueForecast = async (req, res) => {
  try {
    // Next month forecast
    const nextMonth = await pool.query(`
      SELECT 
        SUM(value * closing_probability / 100) as forecasted_revenue,
        COUNT(*) as opportunity_count,
        SUM(value) as potential_revenue
      FROM opportunities
      WHERE expected_close_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND pipeline_stage NOT IN ('closed_lost', 'closed_won')
    `);
    
    // High probability deals
    const highProbDeals = await pool.query(`
      SELECT o.*, c.company_name
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE closing_probability >= 70
        AND pipeline_stage NOT IN ('closed_lost', 'closed_won')
        AND expected_close_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY value DESC
    `);
    
    // Conversion rate
    const conversionRate = await pool.query(`
      SELECT 
        COUNT(CASE WHEN pipeline_stage = 'closed_won' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100 as conversion_rate
      FROM opportunities
      WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
    `);
    
    res.json({
      forecast: nextMonth.rows[0],
      high_probability_deals: highProbDeals.rows,
      conversion_rate: conversionRate.rows[0]?.conversion_rate || 0
    });
  } catch (error) {
    console.error('Get revenue forecast error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getPipelineMetrics,
  getRevenueForecast
};
