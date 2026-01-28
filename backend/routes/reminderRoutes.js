const express = require('express');
const router = express.Router();
const {
  getUserReminders,
  getDueReminders,
  createReminder,
  updateReminderStatus,
  deleteReminder
} = require('../controllers/reminderController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getUserReminders);
router.get('/due', getDueReminders);
router.post('/', createReminder);
router.put('/:id', updateReminderStatus);
router.delete('/:id', deleteReminder);

module.exports = router;
