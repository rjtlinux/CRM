const express = require('express');
const router = express.Router();
const {
  getCustomerOutstanding,
  getPartyLedger,
  getTopDefaulters,
  getPaymentCollectionTrend,
  getCustomerCreditScore,
  getAllCreditScores
} = require('../controllers/udharKhataController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get customer outstanding balances
router.get('/outstanding', getCustomerOutstanding);

// Get party-wise ledger for a specific customer
router.get('/ledger/:customerId', getPartyLedger);

// Get top defaulters
router.get('/defaulters', getTopDefaulters);

// Get payment collection trend
router.get('/collection-trend', getPaymentCollectionTrend);

// Get customer credit score
router.get('/credit-score/:customerId', getCustomerCreditScore);

// Get all customer credit scores
router.get('/credit-scores', getAllCreditScores);

module.exports = router;
