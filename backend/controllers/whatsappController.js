const pool = require('../config/database');
const { sendWhatsAppMessage, markAsRead } = require('../utils/whatsappSender');
const { runAgenticLoop, VOICE_SYSTEM_PROMPT, buildCleanHistory } = require('./aiController');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'buzeye_whatsapp_verify_2026';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// ─── WEBHOOK VERIFICATION (GET) ──────────────────────────────────────────────

const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified');
    return res.status(200).send(challenge);
  }
  console.warn('[WhatsApp] Webhook verification failed');
  return res.sendStatus(403);
};

// ─── LOAD CONVERSATION HISTORY FROM DB ───────────────────────────────────────

const getConversation = async (waPhone) => {
  const r = await pool.query(
    'SELECT * FROM whatsapp_conversations WHERE wa_phone = $1',
    [waPhone]
  );
  if (r.rows.length) return r.rows[0];
  return null;
};

const upsertConversation = async (waPhone, customerId, customerName, messages) => {
  await pool.query(
    `INSERT INTO whatsapp_conversations (wa_phone, customer_id, customer_name, messages, last_message_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (wa_phone) DO UPDATE SET
       customer_id = COALESCE($2, whatsapp_conversations.customer_id),
       customer_name = COALESCE($3, whatsapp_conversations.customer_name),
       messages = $4,
       last_message_at = NOW()`,
    [waPhone, customerId || null, customerName || null, JSON.stringify(messages)]
  );
};

// ─── MATCH WHATSAPP PHONE TO CUSTOMER ────────────────────────────────────────

const findCustomerByPhone = async (waPhone) => {
  const clean = waPhone.replace(/\D/g, '').slice(-10);
  const r = await pool.query(
    `SELECT id, company_name FROM customers
     WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = $1
     LIMIT 1`,
    [clean]
  );
  return r.rows[0] || null;
};

// ─── WHATSAPP SYSTEM PROMPT (channel-aware) ───────────────────────────────────

const buildWhatsAppPrompt = (customerName) => {
  const who = customerName
    ? `You are chatting with ${customerName} via WhatsApp.`
    : 'You are chatting with an unknown contact via WhatsApp.';

  return `${VOICE_SYSTEM_PROMPT}

${who} This is a WhatsApp conversation — keep messages concise and WhatsApp-friendly. No markdown formatting. Use plain text only.`;
};

// ─── INCOMING MESSAGE HANDLER (POST) ─────────────────────────────────────────

const handleIncomingMessage = async (req, res) => {
  // Always respond 200 immediately — Meta retries if we don't
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.messages?.length) return; // status updates, not messages

    const msg = value.messages[0];
    if (msg.type !== 'text') {
      // For now only handle text. Audio/image support can be added later.
      await sendWhatsAppMessage(PHONE_NUMBER_ID, ACCESS_TOKEN, msg.from,
        'Abhi sirf text messages support hain. Please type karein.');
      return;
    }

    const waPhone = msg.from; // e.g. "919876543210"
    const userText = msg.text.body.trim();
    const waMessageId = msg.id;

    // Mark as read
    if (waMessageId) markAsRead(PHONE_NUMBER_ID, ACCESS_TOKEN, waMessageId).catch(() => {});

    console.log(`[WhatsApp] Incoming from ${waPhone}: ${userText}`);

    // Load conversation history
    const convo = await getConversation(waPhone);
    const history = convo?.messages || [];

    // Try to identify customer by phone number
    let customer = convo?.customer_id
      ? { id: convo.customer_id, company_name: convo.customer_name }
      : await findCustomerByPhone(waPhone);

    const systemPrompt = buildWhatsAppPrompt(customer?.company_name || null);

    // Use the admin user (id=2) as the acting user for DB writes
    // In future this can be the tenant's first admin user
    const adminUser = await pool.query(
      "SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1"
    );
    const userId = adminUser.rows[0]?.id || 1;

    // Run the same AI agentic loop as the portal
    const { response, cleanHistory } = await runAgenticLoop(
      systemPrompt,
      history,
      userText,
      userId
    );

    // Save updated history to DB
    await upsertConversation(
      waPhone,
      customer?.id,
      customer?.company_name,
      cleanHistory
    );

    // Send reply back to WhatsApp
    await sendWhatsAppMessage(PHONE_NUMBER_ID, ACCESS_TOKEN, waPhone, response);
    console.log(`[WhatsApp] Replied to ${waPhone}: ${response}`);

  } catch (err) {
    console.error('[WhatsApp] Handler error:', err.message);
  }
};

// ─── GET RECENT CONVERSATIONS (for admin panel) ───────────────────────────────

const getConversations = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT wc.id, wc.wa_phone, wc.customer_name, wc.last_message_at,
              jsonb_array_length(wc.messages) as message_count,
              wc.messages->-1 as last_message
       FROM whatsapp_conversations wc
       ORDER BY wc.last_message_at DESC
       LIMIT 50`
    );
    res.json({ conversations: rows });
  } catch (err) {
    console.error('[WhatsApp] Get conversations error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET SINGLE CONVERSATION ──────────────────────────────────────────────────

const getConversationDetail = async (req, res) => {
  try {
    const { phone } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM whatsapp_conversations WHERE wa_phone = $1',
      [phone]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ conversation: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET WHATSAPP CONFIG STATUS ───────────────────────────────────────────────

const getConfig = async (req, res) => {
  const isConfigured = !!(PHONE_NUMBER_ID && ACCESS_TOKEN);
  res.json({
    configured: isConfigured,
    phone_number_id: PHONE_NUMBER_ID || null,
    display_phone: isConfigured ? '+1 555-164-6700' : null, // fetch from Meta in prod
  });
};

module.exports = {
  verifyWebhook,
  handleIncomingMessage,
  getConversations,
  getConversationDetail,
  getConfig,
};
