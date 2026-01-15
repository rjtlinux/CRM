const pool = require('../config/database');

const getAllCosts = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM costs ORDER BY cost_date DESC'
    );
    res.json({ costs: result.rows });
  } catch (error) {
    console.error('Get costs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getCostById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM costs WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost not found' });
    }
    
    res.json({ cost: result.rows[0] });
  } catch (error) {
    console.error('Get cost error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createCost = async (req, res) => {
  try {
    const { category, description, amount, cost_date, vendor, payment_status, receipt_number } = req.body;
    
    const result = await pool.query(
      `INSERT INTO costs (category, description, amount, cost_date, vendor, payment_status, receipt_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [category, description, amount, cost_date, vendor, payment_status, receipt_number, req.user.id]
    );
    
    res.status(201).json({ 
      message: 'Cost created successfully',
      cost: result.rows[0] 
    });
  } catch (error) {
    console.error('Create cost error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateCost = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description, amount, cost_date, vendor, payment_status, receipt_number } = req.body;
    
    const result = await pool.query(
      `UPDATE costs 
       SET category = $1, description = $2, amount = $3, cost_date = $4, 
           vendor = $5, payment_status = $6, receipt_number = $7
       WHERE id = $8
       RETURNING *`,
      [category, description, amount, cost_date, vendor, payment_status, receipt_number, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost not found' });
    }
    
    res.json({ 
      message: 'Cost updated successfully',
      cost: result.rows[0] 
    });
  } catch (error) {
    console.error('Update cost error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteCost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM costs WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost not found' });
    }
    
    res.json({ message: 'Cost deleted successfully' });
  } catch (error) {
    console.error('Delete cost error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllCosts,
  getCostById,
  createCost,
  updateCost,
  deleteCost
};
