const pool = require('../config/database');

const getAllSales = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.company_name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE (s.payment_method IS NULL OR s.payment_method != 'udhar')
      ORDER BY s.sale_date DESC
    `);
    res.json({ sales: result.rows });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT s.*, c.company_name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    res.json({ sale: result.rows[0] });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createSale = async (req, res) => {
  try {
    const { customer_id, sale_date, amount, description, status, payment_method, invoice_number } = req.body;
    
    // Validation
    if (!customer_id) {
      return res.status(400).json({ error: 'Customer is required' });
    }
    if (!sale_date) {
      return res.status(400).json({ error: 'Sale date is required' });
    }
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    // Verify customer exists
    const customerCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Customer not found' });
    }
    
    const result = await pool.query(
      `INSERT INTO sales (customer_id, sale_date, amount, description, status, payment_method, invoice_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [customer_id, sale_date, amount, description || '', status || 'completed', payment_method || 'cash', invoice_number || null, req.user.id]
    );
    
    res.status(201).json({ 
      message: 'Sale created successfully',
      sale: result.rows[0] 
    });
  } catch (error) {
    console.error('Create sale error:', error);
    // Provide more specific error messages
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid customer selected' });
    }
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Duplicate invoice number' });
    }
    res.status(500).json({ error: 'Failed to create sale. Please check all fields and try again.' });
  }
};

const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, sale_date, amount, description, status, payment_method, invoice_number } = req.body;
    
    const result = await pool.query(
      `UPDATE sales 
       SET customer_id = $1, sale_date = $2, amount = $3, description = $4, 
           status = $5, payment_method = $6, invoice_number = $7
       WHERE id = $8
       RETURNING *`,
      [customer_id, sale_date, amount, description, status, payment_method, invoice_number, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    res.json({ 
      message: 'Sale updated successfully',
      sale: result.rows[0] 
    });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM sales WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale
};
