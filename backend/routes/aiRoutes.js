const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/aiRateLimit');
const {
  processVoiceCommand,
  getChatResponse,
  generateSmartReminder,
  suggestDataEntry,
  conversationalAnalytics,
} = require('../controllers/aiController');

router.use(authenticateToken);
router.use(aiRateLimiter);

router.post('/voice-command', processVoiceCommand);
router.post('/chat', getChatResponse);
router.post('/smart-reminder', generateSmartReminder);
router.post('/suggest', suggestDataEntry);
router.post('/analytics', conversationalAnalytics);

module.exports = router;
