const express = require('express');
const router = express.Router();
const {
  getAllCosts,
  getCostById,
  createCost,
  updateCost,
  deleteCost
} = require('../controllers/costController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getAllCosts);
router.get('/:id', getCostById);
router.post('/', createCost);
router.put('/:id', updateCost);
router.delete('/:id', deleteCost);

module.exports = router;
