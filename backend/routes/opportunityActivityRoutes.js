const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getActivities,
  addActivity,
  getComments,
  addComment,
  updateComment,
  deleteComment
} = require('../controllers/opportunityActivityController');

// All routes require authentication
router.use(authenticateToken);

// Activity routes
router.get('/:opportunityId/activities', getActivities);
router.post('/:opportunityId/activities', addActivity);

// Comment routes
router.get('/:opportunityId/comments', getComments);
router.post('/:opportunityId/comments', addComment);
router.put('/comments/:commentId', updateComment);
router.delete('/comments/:commentId', deleteComment);

module.exports = router;
