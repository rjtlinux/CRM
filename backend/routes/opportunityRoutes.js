const express = require('express');
const router = express.Router();
const {
  getAllOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getPipelineMetrics,
  getRevenueForecast
} = require('../controllers/opportunityController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getAllOpportunities);
router.get('/pipeline-metrics', getPipelineMetrics);
router.get('/revenue-forecast', getRevenueForecast);
router.get('/:id', getOpportunityById);
router.post('/', createOpportunity);
router.put('/:id', updateOpportunity);
router.delete('/:id', deleteOpportunity);

module.exports = router;
