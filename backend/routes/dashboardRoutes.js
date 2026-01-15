const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getSalesTrend,
  getRevenueAnalytics
} = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.get('/sales-trend', getSalesTrend);
router.get('/revenue', getRevenueAnalytics);

module.exports = router;
