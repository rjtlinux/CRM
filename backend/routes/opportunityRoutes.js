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
const { sanitize, validate, opportunityValidationRules, opportunityUpdateRules } = require('../middleware/validators');

router.use(authenticateToken);

router.get('/', getAllOpportunities);
router.get('/pipeline-metrics', getPipelineMetrics);
router.get('/revenue-forecast', getRevenueForecast);
router.get('/:id', getOpportunityById);
router.post('/', sanitize, opportunityValidationRules(), validate, createOpportunity);
router.put('/:id', sanitize, opportunityUpdateRules(), validate, updateOpportunity);
router.delete('/:id', deleteOpportunity);

module.exports = router;
