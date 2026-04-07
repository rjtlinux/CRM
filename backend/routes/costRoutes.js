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
const { sanitize, validate, costValidationRules } = require('../middleware/validators');

router.use(authenticateToken);

router.get('/', getAllCosts);
router.get('/:id', getCostById);
router.post('/', sanitize, costValidationRules(), validate, createCost);
router.put('/:id', sanitize, costValidationRules(), validate, updateCost);
router.delete('/:id', deleteCost);

module.exports = router;
