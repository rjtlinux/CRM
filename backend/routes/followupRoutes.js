const express = require('express');
const router = express.Router();
const {
  getAllFollowups,
  getMissedFollowups,
  getUpcomingFollowups,
  createFollowup,
  updateFollowup,
  deleteFollowup
} = require('../controllers/followupController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getAllFollowups);
router.get('/missed', getMissedFollowups);
router.get('/upcoming', getUpcomingFollowups);
router.post('/', createFollowup);
router.put('/:id', updateFollowup);
router.delete('/:id', deleteFollowup);

module.exports = router;
