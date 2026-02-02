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
    const { 
      company_name, 
      contact_person, 
      contact_designation,
      email, 
      phone, 
      address, 
      pincode,
      city, 
      country, 
      sector,
      business_type,
      generation_mode,
      company_size
    } = req.body;
    
    // Check if company name already exists
    const existingCustomer = await pool.query(
      'SELECT id FROM customers WHERE LOWER(company_name) = LOWER($1)',
      [company_name]
    );
    
    if (existingCustomer.rows.length > 0) {
      return res.status(400).json({ 
        error: 'A customer with this company name already exists. Company names must be unique.' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO customers (
        company_name, contact_person, contact_designation, email, phone, 
        address, pincode, city, country, sector, 
        business_type, generation_mode, company_size, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        company_name, 
        contact_person, 
        contact_designation,
        email, 
        phone, 
        address, 
        pincode,
        city, 
        country, 
        sector || 'Other',
        business_type || 'new',
        generation_mode || 'web_enquiry',
        company_size,
        req.user.id
      ]
    );
    
    res.status(201).json({ 
      message: 'Customer created successfully',
      customer: result.rows[0] 
    });
  } catch (error) {
    console.error('Create customer error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'A customer with this company name already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      company_name, 
      contact_person, 
      contact_designation,
      email, 
      phone, 
      address, 
      pincode,
      city, 
      country, 
      status, 
      sector,
      business_type,
      generation_mode,
      company_size
    } = req.body;
    
    // Check if company name already exists for another customer
    const existingCustomer = await pool.query(
      'SELECT id FROM customers WHERE LOWER(company_name) = LOWER($1) AND id != $2',
      [company_name, id]
    );
    
    if (existingCustomer.rows.length > 0) {
      return res.status(400).json({ 
        error: 'A customer with this company name already exists. Company names must be unique.' 
      });
    }
    
    const result = await pool.query(
      `UPDATE customers 
       SET company_name = $1, contact_person = $2, contact_designation = $3, 
           email = $4, phone = $5, address = $6, pincode = $7, 
           city = $8, country = $9, status = $10, sector = $11,
           business_type = $12, generation_mode = $13, company_size = $14
       WHERE id = $15
       RETURNING *`,
      [
        company_name, 
        contact_person, 
        contact_designation,
        email, 
        phone, 
        address, 
        pincode,
        city, 
        country, 
        status, 
        sector || 'Other',
        business_type || 'new',
        generation_mode || 'web_enquiry',
        company_size,
        id
      ]
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
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'A customer with this company name already exists' });
    }
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
