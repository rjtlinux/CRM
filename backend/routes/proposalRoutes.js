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

router.use(authenticateToken);

router.get('/', getAllProposals);
router.get('/:id', getProposalById);
router.post('/', createProposal);
router.put('/:id', updateProposal);
router.delete('/:id', deleteProposal);

module.exports = router;
