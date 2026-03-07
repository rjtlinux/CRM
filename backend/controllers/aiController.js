const OpenAI = require('openai');
const NodeCache = require('node-cache');
const pool = require('../config/database');

if (!process.env.OPENAI_API_KEY) {
  console.warn('[AI] OPENAI_API_KEY not set - AI features will be unavailable');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new NodeCache({ stdTTL: 3600 });

const safeError = (err) => {
  const msg = err?.message || '';
  if (msg.includes('quota') || msg.includes('429')) return 'AI service quota exceeded. Please try again later.';
  if (msg.includes('401') || msg.includes('auth')) return 'AI service configuration error.';
  return 'AI feature temporarily unavailable. Please try again.';
};

// ─── DB HELPERS ──────────────────────────────────────────────────────────────

const findCustomer = async (name) => {
  const r = await pool.query(
    `SELECT id, company_name, contact_person, phone FROM customers
     WHERE LOWER(company_name) LIKE LOWER($1) OR LOWER(contact_person) LIKE LOWER($1)
     ORDER BY CASE WHEN LOWER(company_name)=LOWER($2) OR LOWER(contact_person)=LOWER($2) THEN 0 ELSE 1 END
     LIMIT 3`,
    [`%${name}%`, name]
  );
  return r.rows;
};

const nextInvoiceNumber = async () => {
  const r = await pool.query(
    `SELECT invoice_number FROM sales WHERE invoice_number ~ '^[0-9]+$' ORDER BY CAST(invoice_number AS INT) DESC LIMIT 1`
  );
  return r.rows.length > 0 ? String(parseInt(r.rows[0].invoice_number) + 1) : '1';
};

// ─── WHISPER TRANSCRIPTION ───────────────────────────────────────────────────

const transcribeAudio = async (fileBuffer, mimetype) => {
  const { toFile } = require('openai');
  const ext = mimetype.includes('webm') ? 'webm'
    : mimetype.includes('ogg') ? 'ogg'
    : mimetype.includes('mp4') ? 'mp4'
    : mimetype.includes('wav') ? 'wav' : 'webm';

  const audioFile = await toFile(fileBuffer, `audio.${ext}`, { type: mimetype });
  const result = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'hi',
    response_format: 'text',
  });
  return result.trim();
};

// ─── AI TOOLS (descriptions in English for better accuracy) ──────────────────

const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'record_udhar',
      description: 'Record a credit/udhar entry when goods or services are given to a customer on credit. Payment will come later. This goes into the Credit Book (Udhar Khata).',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Name of the customer or company' },
          amount: { type: 'number', description: 'Amount in Indian Rupees' },
          product: { type: 'string', description: 'What was given — product or service description' },
          quantity: { type: 'number', description: 'Quantity if applicable' },
        },
        required: ['customer_name', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_sale',
      description: 'Record a completed cash sale where customer paid immediately.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer or company name' },
          amount: { type: 'number', description: 'Sale amount in Indian Rupees' },
          product: { type: 'string', description: 'What was sold' },
        },
        required: ['customer_name', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_payment',
      description: 'Record a payment received from a customer against their outstanding udhar/credit balance.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer name' },
          amount: { type: 'number', description: 'Payment amount in Rupees' },
        },
        required: ['customer_name', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_balance',
      description: 'Check outstanding udhar/credit balance for a specific customer.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer name to check' },
        },
        required: ['customer_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_sales',
      description: 'Get sales summary for today or this month — total count and amount.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'month', 'week'], description: 'Time period' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_customer',
      description: 'Add a new customer to the database using ONLY their name. Do NOT ask for phone, email, or any other details — the user will fill those in later from the Customers page.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Customer or company name — this is the only thing needed' },
        },
        required: ['name'],
      },
    },
  },
];

// ─── SYSTEM PROMPT — in English, let GPT naturally handle Hindi ──────────────

const VOICE_SYSTEM_PROMPT = `You are a CRM assistant for an Indian small business. You speak naturally in whatever language the user uses — Hindi, English, or Hinglish. Use ₹ for amounts.

You can: record udhar/credit, record cash sales, record payments received, check customer balances, show sales summaries, and add new customers (by name only — never ask for phone/email/other details, tell them to add those later from Customers page).

If a customer isn't in the database, ask if you should add them. Keep responses short and natural.`;

// ─── Execute tool call ───────────────────────────────────────────────────────

const executeTool = async (name, args, userId) => {
  switch (name) {
    case 'record_udhar': {
      const customers = await findCustomer(args.customer_name);
      if (!customers.length) {
        return JSON.stringify({ status: 'customer_not_found', searched_name: args.customer_name });
      }
      const c = customers[0];
      const inv = await nextInvoiceNumber();
      const desc = [args.product, args.quantity ? `${args.quantity} units` : null, 'Voice entry']
        .filter(Boolean).join(' · ');
      await pool.query(
        `INSERT INTO sales (customer_id, amount, description, status, payment_method, sale_date, invoice_number, created_by)
         VALUES ($1, $2, $3, 'pending', 'udhar', CURRENT_DATE, $4, $5)`,
        [c.id, args.amount, desc, inv, userId]
      );
      const outstanding = await pool.query(
        `SELECT COALESCE(SUM(amount),0) as total FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending'`,
        [c.id]
      );
      return JSON.stringify({
        status: 'success', action: 'udhar_recorded',
        customer: c.company_name, amount: args.amount,
        total_outstanding: parseFloat(outstanding.rows[0].total),
      });
    }

    case 'create_sale': {
      const customers = await findCustomer(args.customer_name);
      if (!customers.length) {
        return JSON.stringify({ status: 'customer_not_found', searched_name: args.customer_name });
      }
      const c = customers[0];
      const inv = await nextInvoiceNumber();
      const desc = [args.product, 'Voice entry'].filter(Boolean).join(' · ');
      await pool.query(
        `INSERT INTO sales (customer_id, amount, description, status, sale_date, invoice_number, created_by)
         VALUES ($1, $2, $3, 'completed', CURRENT_DATE, $4, $5)`,
        [c.id, args.amount, desc, inv, userId]
      );
      return JSON.stringify({ status: 'success', action: 'sale_recorded', customer: c.company_name, amount: args.amount });
    }

    case 'record_payment': {
      const customers = await findCustomer(args.customer_name);
      if (!customers.length) {
        return JSON.stringify({ status: 'customer_not_found', searched_name: args.customer_name });
      }
      const c = customers[0];
      const pending = await pool.query(
        `SELECT id, amount FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending' ORDER BY sale_date ASC LIMIT 1`,
        [c.id]
      );
      if (pending.rows.length) {
        const p = pending.rows[0];
        if (parseFloat(args.amount) >= parseFloat(p.amount)) {
          await pool.query(`UPDATE sales SET status='completed' WHERE id=$1`, [p.id]);
        } else {
          await pool.query(`UPDATE sales SET amount=amount-$1 WHERE id=$2`, [args.amount, p.id]);
        }
      } else {
        const inv = await nextInvoiceNumber();
        await pool.query(
          `INSERT INTO sales (customer_id, amount, description, status, sale_date, invoice_number, created_by)
           VALUES ($1, $2, 'Payment received (Voice)', 'completed', CURRENT_DATE, $3, $4)`,
          [c.id, args.amount, inv, userId]
        );
      }
      const remaining = await pool.query(
        `SELECT COALESCE(SUM(amount),0) as total FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending'`,
        [c.id]
      );
      return JSON.stringify({
        status: 'success', action: 'payment_recorded',
        customer: c.company_name, amount: args.amount,
        remaining_balance: parseFloat(remaining.rows[0].total),
      });
    }

    case 'check_balance': {
      const customers = await findCustomer(args.customer_name);
      if (!customers.length) {
        return JSON.stringify({ status: 'customer_not_found', searched_name: args.customer_name });
      }
      const c = customers[0];
      const r = await pool.query(
        `SELECT COALESCE(SUM(amount),0) as outstanding FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending'`,
        [c.id]
      );
      return JSON.stringify({ status: 'success', customer: c.company_name, outstanding: parseFloat(r.rows[0].outstanding) });
    }

    case 'check_sales': {
      const today = await pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM sales WHERE sale_date=CURRENT_DATE AND status='completed'`
      );
      const month = await pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM sales WHERE DATE_TRUNC('month',sale_date)=DATE_TRUNC('month',CURRENT_DATE) AND status='completed'`
      );
      return JSON.stringify({
        status: 'success',
        today: { count: parseInt(today.rows[0].count), total: parseFloat(today.rows[0].total) },
        month: { count: parseInt(month.rows[0].count), total: parseFloat(month.rows[0].total) },
      });
    }

    case 'create_customer': {
      try {
        const existing = await findCustomer(args.name);
        if (existing.length) {
          return JSON.stringify({ status: 'already_exists', customer: existing[0].company_name, id: existing[0].id });
        }
        const r = await pool.query(
          `INSERT INTO customers (company_name, status, created_by) VALUES ($1, 'active', $2) RETURNING id`,
          [args.name, userId]
        );
        return JSON.stringify({ status: 'success', action: 'customer_created', customer: args.name, id: r.rows[0].id, note: 'Customer added with name only. User should add phone, email and other details from Customers page when they have time.' });
      } catch (e) {
        return JSON.stringify({ status: 'error', message: e.message });
      }
    }

    default:
      return JSON.stringify({ status: 'error', message: 'Unknown tool' });
  }
};

// ─── VOICE COMMAND HANDLER ───────────────────────────────────────────────────

const processVoiceCommand = async (req, res) => {
  try {
    const userId = req.user.id;

    let clientMessages = [];
    try {
      const raw = req.body.messages;
      clientMessages = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    } catch { clientMessages = []; }

    let text = req.body.text || '';
    let transcript = null;

    if (req.file) {
      try {
        transcript = await transcribeAudio(req.file.buffer, req.file.mimetype || 'audio/webm');
        text = transcript;
      } catch (whisperErr) {
        console.error('[AI Whisper]', whisperErr.message);
        return res.status(500).json({ response: 'Audio samajh nahi aaya. Dobara try karo ya type kar do.', success: false });
      }
    }

    if (!text?.trim()) {
      return res.status(400).json({ response: 'Kuch suna nahi, dobara bolo.', success: false });
    }

    const messages = [
      { role: 'system', content: VOICE_SYSTEM_PROMPT },
      ...clientMessages.slice(-12),
      { role: 'user', content: text },
    ];

    // Agentic loop: GPT calls tools, gets results, eventually writes a response
    for (let i = 0; i < 8; i++) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: AI_TOOLS,
        tool_choice: 'auto',
        temperature: 0.85,
        max_tokens: 400,
      });

      const choice = completion.choices[0];
      messages.push(choice.message);

      if (!choice.message.tool_calls?.length) {
        const responseText = choice.message.content;
        // Only keep user and assistant TEXT messages (no tool_calls, no tool responses)
        // Strip tool_calls from assistant messages so they don't break the next API call
        const cleanHistory = messages
          .slice(1)
          .filter(m => {
            if (m.role === 'user') return true;
            if (m.role === 'assistant' && typeof m.content === 'string' && !m.tool_calls?.length) return true;
            return false;
          })
          .map(m => ({ role: m.role, content: m.content }))
          .slice(-14);

        return res.json({ response: responseText, messages: cleanHistory, transcript, success: true });
      }

      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args, userId);
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
      }
    }

    return res.json({ response: 'Thoda aur detail mein batao — kya karna hai?', transcript, success: false });
  } catch (error) {
    console.error('[AI] Voice error:', error.message);
    res.status(500).json({ response: safeError(error), success: false });
  }
};

// ─── CHATBOT ─────────────────────────────────────────────────────────────────

const getChatResponse = async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages?.length) return res.status(400).json({ error: 'Messages required' });

    const systemPrompt = `You are a helpful CRM assistant for an Indian small business. Reply in the same language the user uses. The CRM has: Dashboard, Udhar Khata (Credit Book), Sales, Customers, Opportunities, Follow-ups, Proposals, and Reports.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-12),
      ],
      max_tokens: 400,
      temperature: 0.85,
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('[AI] Chat error:', error.message);
    res.status(500).json({ response: safeError(error) });
  }
};

// ─── SMART PAYMENT REMINDER ─────────────────────────────────────────────────

const generateSmartReminder = async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId required' });

    const cacheKey = `reminder-${customerId}-${new Date().toDateString()}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const customerRes = await pool.query('SELECT * FROM customers WHERE id=$1', [customerId]);
    if (!customerRes.rows.length) return res.status(404).json({ error: 'Customer not found' });
    const customer = customerRes.rows[0];

    const outstandingRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, MIN(sale_date) as oldest_date
       FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending'`,
      [customerId]
    );
    const { total: amount, count: invoiceCount, oldest_date } = outstandingRes.rows[0];

    if (parseFloat(amount) === 0) {
      return res.json({ message: 'No outstanding balance!', amount: 0 });
    }

    const daysPending = oldest_date ? Math.floor((Date.now() - new Date(oldest_date)) / 86400000) : 0;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Write a short WhatsApp payment reminder in Hinglish on behalf of an Indian business owner. Under 80 words, use ₹, no emojis. Adjust tone: casual for small amounts, professional for medium, formal for large. Gentle for recent dues, firmer for old ones. Sound like a real person, not a template.`,
        },
        {
          role: 'user',
          content: `Customer: ${customer.company_name} (${customer.contact_person})
Outstanding: ₹${parseFloat(amount).toLocaleString('en-IN')}
Pending bills: ${invoiceCount}
Days since oldest bill: ${daysPending}
Write a WhatsApp reminder.`,
        },
      ],
      max_tokens: 200,
      temperature: 0.9,
    });

    const message = completion.choices[0].message.content;
    const day = new Date().getDay();
    let suggestedTime = 'Tomorrow morning, 10-11 AM';
    if (day === 5) suggestedTime = 'Today evening, 4-5 PM (before weekend)';
    else if (day === 6 || day === 0) suggestedTime = 'Monday morning, 10-11 AM';

    const phone = customer.phone?.replace(/[^0-9]/g, '');
    const whatsappLink = phone
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
      : null;

    const result = { message, amount: parseFloat(amount), invoiceCount, daysPending, suggestedTime, customerName: customer.company_name, whatsappLink };
    cache.set(cacheKey, result, 1800);
    res.json(result);
  } catch (error) {
    console.error('[AI] Reminder error:', error.message);
    res.status(500).json({ error: safeError(error) });
  }
};

// ─── DATA ENTRY SUGGESTIONS (DB-only, no OpenAI cost) ────────────────────────

const suggestDataEntry = async (req, res) => {
  try {
    const { field, context = {}, partialInput = '' } = req.body;
    let suggestions = [];

    switch (field) {
      case 'customer': {
        const r = await pool.query(
          `SELECT c.id, c.company_name, c.contact_person, c.phone, COUNT(s.id) as order_count, MAX(s.created_at) as last_order
           FROM customers c LEFT JOIN sales s ON c.id=s.customer_id
           WHERE LOWER(c.company_name) LIKE LOWER($1) OR LOWER(c.contact_person) LIKE LOWER($1)
           GROUP BY c.id ORDER BY order_count DESC, last_order DESC NULLS LAST LIMIT 6`,
          [`%${partialInput}%`]
        );
        suggestions = r.rows.map(c => ({
          value: c.id, label: c.company_name,
          subtitle: `${c.contact_person}${c.phone ? ' · ' + c.phone : ''} · ${c.order_count} orders`,
        }));
        break;
      }
      case 'product': {
        const params = context.customerId
          ? partialInput ? [context.customerId, `%${partialInput}%`] : [context.customerId]
          : partialInput ? [`%${partialInput}%`] : [];
        const where = context.customerId
          ? `WHERE customer_id=$1${partialInput ? ' AND LOWER(description) LIKE LOWER($2)' : ''}`
          : partialInput ? `WHERE LOWER(description) LIKE LOWER($1)` : '';
        const r = await pool.query(`SELECT description as product, COUNT(*) as freq FROM sales ${where} GROUP BY description ORDER BY freq DESC LIMIT 5`, params);
        suggestions = r.rows.map(p => ({ value: p.product, label: p.product, subtitle: `${p.freq} times` }));
        break;
      }
      case 'amount': {
        if (context.customerId) {
          const r = await pool.query(
            `SELECT ROUND(AVG(amount)) as avg, MAX(amount) as max FROM sales WHERE customer_id=$1 AND status='completed'`,
            [context.customerId]
          );
          if (r.rows[0].avg) {
            suggestions = [
              { value: r.rows[0].avg, label: `₹${parseInt(r.rows[0].avg).toLocaleString('en-IN')}`, subtitle: 'Usual amount' },
              { value: r.rows[0].max, label: `₹${parseInt(r.rows[0].max).toLocaleString('en-IN')}`, subtitle: 'Highest' },
            ];
          }
        }
        break;
      }
    }
    res.json({ suggestions });
  } catch (error) {
    console.error('[AI] Suggest error:', error.message);
    res.json({ suggestions: [] });
  }
};

// ─── CONVERSATIONAL ANALYTICS ────────────────────────────────────────────────

const conversationalAnalytics = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    const cacheKey = `analytics-${question.toLowerCase().trim()}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const planning = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Convert natural language business questions to safe PostgreSQL SELECT queries.

Tables: customers(id,company_name,contact_person,phone,city,sector,status), sales(id,customer_id,amount,status,payment_method,description,sale_date), costs(id,amount,category,description,cost_date), opportunities(id,customer_id,value,pipeline_stage,closing_probability,expected_close_date)

Rules: ONLY SELECT. For udhar/outstanding: WHERE payment_method='udhar' AND status='pending'. For revenue: WHERE status='completed'. LIMIT 10 max.

Respond ONLY as JSON: {"sql":"...","visualization":"bar|pie|line|number|table","title":"..."}`,
        },
        { role: 'user', content: question },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const plan = JSON.parse(planning.choices[0].message.content);
    if (!plan.sql.trim().toLowerCase().startsWith('select')) {
      return res.status(400).json({ error: 'Only SELECT queries allowed' });
    }

    const queryResult = await pool.query(plan.sql);

    const answerCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Explain this business data simply in the user's language. Use ₹ for amounts. Key insight first.`,
        },
        { role: 'user', content: `Question: "${question}"\nData: ${JSON.stringify(queryResult.rows.slice(0, 5))}` },
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    const result = {
      answer: answerCompletion.choices[0].message.content,
      data: queryResult.rows,
      visualization: plan.visualization,
      title: plan.title,
      rowCount: queryResult.rowCount,
    };

    cache.set(cacheKey, result, 300);
    res.json(result);
  } catch (error) {
    console.error('[AI] Analytics error:', error.message);
    res.status(500).json({ error: safeError(error) });
  }
};

module.exports = {
  processVoiceCommand,
  getChatResponse,
  generateSmartReminder,
  suggestDataEntry,
  conversationalAnalytics,
};
