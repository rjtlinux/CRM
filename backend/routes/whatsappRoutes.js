const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  verifyWebhook,
  handleIncomingMessage,
  getConversations,
  getConversationDetail,
  getConfig,
} = require('../controllers/whatsappController');

// Meta webhook verification (public — no auth)
router.get('/webhook', verifyWebhook);

// Meta webhook incoming messages (public — Meta sends this, no JWT)
router.post('/webhook', handleIncomingMessage);

// Admin panel endpoints (requires login)
router.get('/config', authenticateToken, getConfig);
router.get('/conversations', authenticateToken, getConversations);
router.get('/conversations/:phone', authenticateToken, getConversationDetail);

module.exports = router;
