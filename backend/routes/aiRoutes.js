const express = require('express');
const multer = require('multer');
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

// Audio uploads stored in memory (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) return cb(null, true);
    cb(new Error('Only audio files allowed'));
  },
});

router.use(authenticateToken);
router.use(aiRateLimiter);

// voice-command accepts optional audio file OR plain JSON text
router.post('/voice-command', upload.single('audio'), processVoiceCommand);
router.post('/chat', getChatResponse);
router.post('/smart-reminder', generateSmartReminder);
router.post('/suggest', suggestDataEntry);
router.post('/analytics', conversationalAnalytics);

module.exports = router;
