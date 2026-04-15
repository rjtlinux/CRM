const pool = require('../config/database');

// Get customer outstanding balances
const getCustomerOutstanding = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT * FROM customer_outstanding
      ORDER BY outstanding_amount DESC
    `);
    
    res.json({
      customers: result.rows,
      summary: {
        total_outstanding: result.rows.reduce((sum, c) => sum + parseFloat(c.outstanding_amount || 0), 0),
        total_customers: result.rows.length,
        critical_count: result.rows.filter(c => c.days_since_last_payment > 90).length,
        high_risk_count: result.rows.filter(c => c.days_since_last_payment > 60).length
      }
    });
  } catch (error) {
    console.error('Get customer outstanding error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get party-wise ledger
const getPartyLedger = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM party_ledger
      WHERE customer_id = $1
      ORDER BY transaction_date DESC, transaction_id DESC
    `, [customerId]);
    
    // Get customer details
    const customerResult = await pool.query(`
      SELECT * FROM customers WHERE id = $1
    `, [customerId]);
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({
      customer: customerResult.rows[0],
      transactions: result.rows,
      summary: {
        total_debit: result.rows.reduce((sum, t) => sum + parseFloat(t.debit || 0), 0),
        total_credit: result.rows.reduce((sum, t) => sum + parseFloat(t.credit || 0), 0),
        current_balance: result.rows[0]?.running_balance || 0
      }
    });
  } catch (error) {
    console.error('Get party ledger error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get top defaulters
const getTopDefaulters = async (req, res) => {
  try {
    const { riskLevel } = req.query;
    
    let query = 'SELECT * FROM top_defaulters';
    const params = [];
    
    if (riskLevel) {
      query += ' WHERE risk_level = $1';
      params.push(riskLevel);
    }
    
    query += ' ORDER BY overdue_amount DESC LIMIT 50';
    
    const result = await pool.query(query, params);
    
    res.json({
      defaulters: result.rows,
      summary: {
        total_overdue: result.rows.reduce((sum, d) => sum + parseFloat(d.overdue_amount || 0), 0),
        critical_count: result.rows.filter(d => d.risk_level === 'Critical').length,
        high_count: result.rows.filter(d => d.risk_level === 'High').length,
        medium_count: result.rows.filter(d => d.risk_level === 'Medium').length
      }
    });
  } catch (error) {
    console.error('Get top defaulters error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get payment collection trend
const getPaymentCollectionTrend = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM payment_collection_trend
      ORDER BY month DESC
      LIMIT 12
    `);
    
    res.json({
      trend: result.rows
    });
  } catch (error) {
    console.error('Get payment collection trend error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get customer credit score
const getCustomerCreditScore = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM customer_credit_score
      WHERE customer_id = $1
    `, [customerId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found or no transaction history' });
    }
    
    res.json({
      credit_score: result.rows[0]
    });
  } catch (error) {
    console.error('Get customer credit score error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all customer credit scores
const getAllCreditScores = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM customer_credit_score
      ORDER BY payment_success_rate DESC, total_transactions DESC
    `);
    
    res.json({
      scores: result.rows
    });
  } catch (error) {
    console.error('Get all credit scores error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Record credit (add to customer's total_deal_amount)
const recordCredit = async (req, res) => {
  try {
    const { customer_id, amount, description } = req.body;
    
    if (!customer_id) {
      return res.status(400).json({ error: 'Please select a customer' });
    }
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Please enter a valid amount' });
    }
    
    // Verify customer exists
    const customerCheck = await pool.query('SELECT id, company_name, total_deal_amount FROM customers WHERE id = $1', [customer_id]);
    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Customer not found' });
    }
    
    const creditAmount = parseFloat(amount);
    
    // Add credit to customer's total_deal_amount
    const result = await pool.query(
      `UPDATE customers SET total_deal_amount = total_deal_amount + $1 WHERE id = $2 RETURNING *`,
      [creditAmount, customer_id]
    );
    
    res.status(201).json({
      message: `Credit of ₹${creditAmount} recorded for ${customerCheck.rows[0].company_name}`,
      customer: result.rows[0],
      credit_added: creditAmount,
      new_total_deal_amount: parseFloat(result.rows[0].total_deal_amount)
    });
  } catch (error) {
    console.error('Record credit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getCustomerOutstanding,
  getPartyLedger,
  getTopDefaulters,
  getPaymentCollectionTrend,
  getCustomerCreditScore,
  getAllCreditScores,
  recordCredit
};
