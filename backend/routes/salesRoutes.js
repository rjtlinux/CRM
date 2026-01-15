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

router.use(authenticateToken);

router.get('/', getAllSales);
router.get('/:id', getSaleById);
router.post('/', createSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

module.exports = router;
