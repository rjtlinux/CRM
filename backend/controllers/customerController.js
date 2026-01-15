const pool = require('../config/database');

const getAllCustomers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customers ORDER BY created_at DESC'
    );
    res.json({ customers: result.rows });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ customer: result.rows[0] });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { company_name, contact_person, email, phone, address, city, country } = req.body;
    
    const result = await pool.query(
      `INSERT INTO customers (company_name, contact_person, email, phone, address, city, country, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [company_name, contact_person, email, phone, address, city, country, req.user.id]
    );
    
    res.status(201).json({ 
      message: 'Customer created successfully',
      customer: result.rows[0] 
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, contact_person, email, phone, address, city, country, status } = req.body;
    
    const result = await pool.query(
      `UPDATE customers 
       SET company_name = $1, contact_person = $2, email = $3, phone = $4, 
           address = $5, city = $6, country = $7, status = $8
       WHERE id = $9
       RETURNING *`,
      [company_name, contact_person, email, phone, address, city, country, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ 
      message: 'Customer updated successfully',
      customer: result.rows[0] 
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
