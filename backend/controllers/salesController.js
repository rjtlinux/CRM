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
    
    // Validation with clear error messages
    if (!customer_id || customer_id === '' || customer_id === 'undefined') {
      return res.status(400).json({ error: 'Please select a customer from the dropdown' });
    }
    if (!sale_date) {
      return res.status(400).json({ error: 'Please select a sale date' });
    }
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Please enter a valid amount greater than 0' });
    }
    
    // Verify customer exists
    const customerCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Selected customer does not exist. Please refresh and try again.' });
    }
    
    // If this is NOT an udhar sale, check if customer has outstanding credit and apply payment
    if (payment_method !== 'udhar' && status === 'completed') {
      const pending = await pool.query(
        `SELECT id, amount FROM sales 
         WHERE customer_id = $1 AND payment_method = 'udhar' AND status = 'pending'
         ORDER BY sale_date ASC LIMIT 1`,
        [customer_id]
      );
      
      if (pending.rows.length > 0) {
        const pendingSale = pending.rows[0];
        const paymentAmount = parseFloat(amount);
        const outstandingAmount = parseFloat(pendingSale.amount);
        
        if (paymentAmount >= outstandingAmount) {
          // Payment covers the entire outstanding amount
          await pool.query(`UPDATE sales SET status = 'completed' WHERE id = $1`, [pendingSale.id]);
          
          // If there's excess, create a new regular sale for the remainder
          if (paymentAmount > outstandingAmount) {
            const excessAmount = paymentAmount - outstandingAmount;
            await pool.query(
              `INSERT INTO sales (customer_id, sale_date, amount, description, status, payment_method, invoice_number, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               RETURNING *`,
              [customer_id, sale_date, excessAmount, description || 'Excess payment after credit settlement', 'completed', payment_method, invoice_number, req.user.id]
            );
          }
          
          return res.status(201).json({ 
            message: `Payment recorded. Outstanding credit of ₹${outstandingAmount} cleared.`,
            creditCleared: outstandingAmount,
            excessAmount: paymentAmount - outstandingAmount
          });
        } else {
          // Partial payment - reduce outstanding amount
          await pool.query(
            `UPDATE sales SET amount = amount - $1 WHERE id = $2`,
            [paymentAmount, pendingSale.id]
          );
          
          return res.status(201).json({ 
            message: `Partial payment of ₹${paymentAmount} recorded against outstanding credit.`,
            paidAmount: paymentAmount,
            remainingCredit: outstandingAmount - paymentAmount
          });
        }
      }
    }
    
    // Regular sale creation (no outstanding credit involved)
    const result = await pool.query(
      `INSERT INTO sales (customer_id, sale_date, amount, description, status, payment_method, invoice_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [customer_id, sale_date, amount, description || null, status || 'completed', payment_method || 'cash', invoice_number || null, req.user.id]
    );
    
    res.status(201).json({ 
      message: 'Sale created successfully',
      sale: result.rows[0] 
    });
  } catch (error) {
    console.error('Create sale error:', error);
    // Provide more specific error messages
    if (error.code === '23503') {
      return res.status(400).json({ error: 'The selected customer is invalid. Please select a valid customer.' });
    }
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This invoice number already exists. Please use a unique invoice number.' });
    }
    if (error.code === '22P02') {
      return res.status(400).json({ error: 'Invalid data format. Please check amount and date fields.' });
    }
    res.status(500).json({ error: 'Unable to create sale. Please check all required fields (Customer, Date, Amount) and try again.' });
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
