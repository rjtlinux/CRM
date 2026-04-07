const express = require('express');
const router = express.Router();
const {
  getAllCustomers,
  getCustomerById,
  getCustomerDetail,
  createCustomer,
  updateCustomer,
  deleteCustomer
} = require('../controllers/customerController');
const { authenticateToken } = require('../middleware/auth');
const { sanitize, validate, customerValidationRules } = require('../middleware/validators');

router.use(authenticateToken);

router.get('/', getAllCustomers);
router.get('/:id/detail', getCustomerDetail);
router.get('/:id', getCustomerById);
router.post('/', sanitize, customerValidationRules(), validate, createCustomer);
router.put('/:id', sanitize, customerValidationRules(), validate, updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;
