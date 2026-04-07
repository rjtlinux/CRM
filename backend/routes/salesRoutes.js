const express = require('express');
const router = express.Router();
const {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale
} = require('../controllers/salesController');
const { authenticateToken } = require('../middleware/auth');
const { sanitize, validate, salesValidationRules } = require('../middleware/validators');

router.use(authenticateToken);

router.get('/', getAllSales);
router.get('/:id', getSaleById);
router.post('/', sanitize, salesValidationRules(), validate, createSale);
router.put('/:id', sanitize, salesValidationRules(), validate, updateSale);
router.delete('/:id', deleteSale);

module.exports = router;
