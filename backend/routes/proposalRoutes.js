const express = require('express');
const router = express.Router();
const {
  getAllProposals,
  getProposalById,
  createProposal,
  updateProposal,
  deleteProposal
} = require('../controllers/proposalController');
const { authenticateToken } = require('../middleware/auth');
const { sanitize, validate, proposalValidationRules } = require('../middleware/validators');

router.use(authenticateToken);

router.get('/', getAllProposals);
router.get('/:id', getProposalById);
router.post('/', sanitize, proposalValidationRules(), validate, createProposal);
router.put('/:id', sanitize, proposalValidationRules(), validate, updateProposal);
router.delete('/:id', deleteProposal);

module.exports = router;
