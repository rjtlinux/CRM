const pool = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    // Total revenue
    const revenueResult = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total_revenue FROM sales WHERE status = 'completed'"
    );
    
    // Total costs
    const costsResult = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total_costs FROM costs WHERE payment_status = 'paid'"
    );
    
    // Total customers
    const customersResult = await pool.query(
      "SELECT COUNT(*) as total_customers FROM customers WHERE status = 'active'"
    );
    
    // Total proposals
    const proposalsResult = await pool.query(
      "SELECT COUNT(*) as total_proposals FROM proposals"
    );
    
    // Pending proposals value
    const pendingProposalsResult = await pool.query(
      "SELECT COALESCE(SUM(total_amount), 0) as pending_value FROM proposals WHERE status IN ('draft', 'sent')"
    );
    
    // Recent sales
    const recentSalesResult = await pool.query(
      `SELECT s.*, c.company_name as customer_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       ORDER BY s.sale_date DESC
       LIMIT 5`
    );
    
    const stats = {
      total_revenue: parseFloat(revenueResult.rows[0].total_revenue),
      total_costs: parseFloat(costsResult.rows[0].total_costs),
      net_profit: parseFloat(revenueResult.rows[0].total_revenue) - parseFloat(costsResult.rows[0].total_costs),
      total_customers: parseInt(customersResult.rows[0].total_customers),
      total_proposals: parseInt(proposalsResult.rows[0].total_proposals),
      pending_proposals_value: parseFloat(pendingProposalsResult.rows[0].pending_value),
      recent_sales: recentSalesResult.rows
    };
    
    res.json({ stats });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getSalesTrend = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    let dateFormat, dateInterval;
    
    switch(period) {
      case 'weekly':
        dateFormat = 'YYYY-IW';
        dateInterval = '12 weeks';
        break;
      case 'yearly':
        dateFormat = 'YYYY';
        dateInterval = '5 years';
        break;
      case 'monthly':
      default:
        dateFormat = 'YYYY-MM';
        dateInterval = '12 months';
    }
    
    const result = await pool.query(`
      SELECT 
        TO_CHAR(sale_date, $1) as period,
        SUM(amount) as total_sales,
        COUNT(*) as sales_count
      FROM sales
      WHERE sale_date >= CURRENT_DATE - INTERVAL '${dateInterval}'
      GROUP BY period
      ORDER BY period ASC
    `, [dateFormat]);
    
    res.json({ trend: result.rows });
  } catch (error) {
    console.error('Get sales trend error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getRevenueAnalytics = async (req, res) => {
  try {
    // Monthly revenue vs costs
    const monthlyResult = await pool.query(`
      SELECT 
        TO_CHAR(date_trunc('month', CURRENT_DATE - INTERVAL '6 months' + (n || ' months')::interval), 'YYYY-MM') as month,
        COALESCE((
          SELECT SUM(amount) 
          FROM sales 
          WHERE TO_CHAR(sale_date, 'YYYY-MM') = TO_CHAR(date_trunc('month', CURRENT_DATE - INTERVAL '6 months' + (n || ' months')::interval), 'YYYY-MM')
          AND status = 'completed'
        ), 0) as revenue,
        COALESCE((
          SELECT SUM(amount) 
          FROM costs 
          WHERE TO_CHAR(cost_date, 'YYYY-MM') = TO_CHAR(date_trunc('month', CURRENT_DATE - INTERVAL '6 months' + (n || ' months')::interval), 'YYYY-MM')
          AND payment_status = 'paid'
        ), 0) as costs
      FROM generate_series(0, 6) as n
      ORDER BY month ASC
    `);
    
    // Sales by status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count, SUM(amount) as total
      FROM sales
      GROUP BY status
    `);
    
    // Costs by category
    const categoryResult = await pool.query(`
      SELECT category, SUM(amount) as total
      FROM costs
      GROUP BY category
      ORDER BY total DESC
    `);
    
    res.json({
      monthly_comparison: monthlyResult.rows,
      sales_by_status: statusResult.rows,
      costs_by_category: categoryResult.rows
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getSalesTrend,
  getRevenueAnalytics
};
