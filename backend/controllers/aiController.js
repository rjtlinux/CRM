const OpenAI = require('openai');
const NodeCache = require('node-cache');
const pool = require('../config/database');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const findCustomer = async (name) => {
  const result = await pool.query(
    `SELECT id, company_name, contact_person, phone FROM customers
     WHERE LOWER(company_name) LIKE LOWER($1) OR LOWER(contact_person) LIKE LOWER($1)
     ORDER BY CASE WHEN LOWER(company_name) = LOWER($2) THEN 0 ELSE 1 END
     LIMIT 3`,
    [`%${name}%`, name]
  );
  return result.rows;
};

// ─── 1. VOICE / TEXT COMMAND ─────────────────────────────────────────────────

const processVoiceCommand = async (req, res) => {
  try {
    const { text, language = 'hi' } = req.body;
    const userId = req.user.id;

    if (!text || text.trim().length < 2) {
      return res.status(400).json({ error: 'Command text is required' });
    }

    // GPT-4o-mini: understand intent + extract entities
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a Hindi/English voice assistant for an Indian small business CRM.
Extract the intent and entities from the user's command. Respond ONLY in JSON.

Possible intents:
- CREATE_SALE: User sold something to a customer
- RECORD_UDHAR: User gave credit/udhar to someone (goods on credit, loan)
- RECORD_PAYMENT: User received payment from customer
- CHECK_BALANCE: User wants to know outstanding balance
- CREATE_CUSTOMER: Add a new customer
- CHECK_SALES: Ask about sales summary

Extract entities:
- customer_name (string)
- amount (number, extract digits)
- product (string, what was sold/given)
- quantity (number)
- date (string, if mentioned)

Examples:
"Ramesh ko 5000 ka maal diya" → {"intent":"RECORD_UDHAR","entities":{"customer_name":"Ramesh","amount":5000,"product":"maal"}}
"Suresh ne 3000 rupay diye" → {"intent":"RECORD_PAYMENT","entities":{"customer_name":"Suresh","amount":3000}}
"Ramesh ka balance kya hai" → {"intent":"CHECK_BALANCE","entities":{"customer_name":"Ramesh"}}
"Aaj kitni sale hui" → {"intent":"CHECK_SALES","entities":{}}
"500 cement bags sell kiya Raj Trading ko" → {"intent":"CREATE_SALE","entities":{"customer_name":"Raj Trading","amount":null,"product":"cement","quantity":500}}`
        },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    const { intent, entities = {} } = aiResponse;

    // Execute intent
    let result;
    switch (intent) {
      case 'RECORD_UDHAR':
        result = await recordUdharFromVoice(entities, userId);
        break;
      case 'CREATE_SALE':
        result = await createSaleFromVoice(entities, userId);
        break;
      case 'RECORD_PAYMENT':
        result = await recordPaymentFromVoice(entities, userId);
        break;
      case 'CHECK_BALANCE':
        result = await checkBalanceFromVoice(entities);
        break;
      case 'CHECK_SALES':
        result = await checkSalesFromVoice(userId);
        break;
      default:
        result = { error: true, message: 'Samajh nahi aaya. Phir se bolein ya type karein.' };
    }

    // Generate friendly Hinglish response
    const responseText = await generateHinglishResponse(intent, result, text);

    res.json({ intent, entities, result, response: responseText, success: !result.error });
  } catch (error) {
    console.error('Voice command error:', error);
    res.status(500).json({
      error: true,
      response: 'Kuch gadbad ho gayi. Please dobara try karein.',
    });
  }
};

const recordUdharFromVoice = async (entities, userId) => {
  if (!entities.customer_name) return { error: true, message: 'Customer ka naam batayein.' };
  if (!entities.amount) return { error: true, message: 'Amount batayein.' };

  const customers = await findCustomer(entities.customer_name);
  if (customers.length === 0) return { error: true, message: `"${entities.customer_name}" naam ka customer nahi mila. Pehle customer banayein.` };

  const customer = customers[0];

  // Get next invoice number
  const lastInvoice = await pool.query(`SELECT invoice_number FROM sales WHERE invoice_number ~ '^[0-9]+$' ORDER BY CAST(invoice_number AS INT) DESC LIMIT 1`);
  const nextInvoice = lastInvoice.rows.length > 0 ? String(parseInt(lastInvoice.rows[0].invoice_number) + 1) : '1';

  const desc = entities.product ? `${entities.product}${entities.quantity ? ` (${entities.quantity} units)` : ''} - Voice entry` : 'Voice entry';

  await pool.query(
    `INSERT INTO sales (customer_id, amount, description, status, payment_method, sale_date, invoice_number, created_by)
     VALUES ($1, $2, $3, 'pending', 'udhar', CURRENT_DATE, $4, $5)`,
    [customer.id, entities.amount, desc, nextInvoice, userId]
  );

  const outstanding = await pool.query(
    `SELECT COALESCE(SUM(amount),0) as total FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending'`,
    [customer.id]
  );

  return { success: true, type: 'udhar', customer: customer.company_name, amount: entities.amount, total_outstanding: outstanding.rows[0].total };
};

const createSaleFromVoice = async (entities, userId) => {
  if (!entities.customer_name) return { error: true, message: 'Customer ka naam batayein.' };
  if (!entities.amount) return { error: true, message: 'Amount batayein.' };

  const customers = await findCustomer(entities.customer_name);
  if (customers.length === 0) return { error: true, message: `"${entities.customer_name}" naam ka customer nahi mila.` };

  const customer = customers[0];
  const desc = entities.product ? `${entities.product}${entities.quantity ? ` - ${entities.quantity} units` : ''} (Voice entry)` : 'Voice entry';

  const lastInvoice = await pool.query(`SELECT invoice_number FROM sales WHERE invoice_number ~ '^[0-9]+$' ORDER BY CAST(invoice_number AS INT) DESC LIMIT 1`);
  const nextInvoice = lastInvoice.rows.length > 0 ? String(parseInt(lastInvoice.rows[0].invoice_number) + 1) : '1';

  await pool.query(
    `INSERT INTO sales (customer_id, amount, description, status, sale_date, invoice_number, created_by)
     VALUES ($1, $2, $3, 'completed', CURRENT_DATE, $4, $5)`,
    [customer.id, entities.amount, desc, nextInvoice, userId]
  );

  return { success: true, type: 'sale', customer: customer.company_name, amount: entities.amount };
};

const recordPaymentFromVoice = async (entities, userId) => {
  if (!entities.customer_name) return { error: true, message: 'Customer ka naam batayein.' };
  if (!entities.amount) return { error: true, message: 'Amount batayein.' };

  const customers = await findCustomer(entities.customer_name);
  if (customers.length === 0) return { error: true, message: `"${entities.customer_name}" naam ka customer nahi mila.` };

  const customer = customers[0];

  // Find oldest pending udhar entry and mark as completed
  const pendingEntry = await pool.query(
    `SELECT id, amount FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending' ORDER BY sale_date ASC LIMIT 1`,
    [customer.id]
  );

  if (pendingEntry.rows.length > 0) {
    const pending = pendingEntry.rows[0];
    if (parseFloat(entities.amount) >= parseFloat(pending.amount)) {
      // Full payment - mark as completed
      await pool.query(`UPDATE sales SET status='completed' WHERE id=$1`, [pending.id]);
    } else {
      // Partial payment - reduce amount
      await pool.query(`UPDATE sales SET amount=amount-$1 WHERE id=$2`, [entities.amount, pending.id]);
    }
  } else {
    // Record as a general payment credit
    const lastInvoice = await pool.query(`SELECT invoice_number FROM sales WHERE invoice_number ~ '^[0-9]+$' ORDER BY CAST(invoice_number AS INT) DESC LIMIT 1`);
    const nextInvoice = lastInvoice.rows.length > 0 ? String(parseInt(lastInvoice.rows[0].invoice_number) + 1) : '1';
    await pool.query(
      `INSERT INTO sales (customer_id, amount, description, status, sale_date, invoice_number, created_by)
       VALUES ($1, $2, 'Payment received (Voice entry)', 'completed', CURRENT_DATE, $3, $4)`,
      [customer.id, entities.amount, nextInvoice, userId]
    );
  }

  const remaining = await pool.query(
    `SELECT COALESCE(SUM(amount),0) as total FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending'`,
    [customer.id]
  );

  return { success: true, type: 'payment', customer: customer.company_name, amount: entities.amount, remaining_balance: remaining.rows[0].total };
};

const checkBalanceFromVoice = async (entities) => {
  if (!entities.customer_name) return { error: true, message: 'Customer ka naam batayein.' };

  const customers = await findCustomer(entities.customer_name);
  if (customers.length === 0) return { error: true, message: `"${entities.customer_name}" naam ka customer nahi mila.` };

  const customer = customers[0];
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount),0) as outstanding FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending'`,
    [customer.id]
  );

  return { success: true, type: 'balance', customer: customer.company_name, outstanding: result.rows[0].outstanding };
};

const checkSalesFromVoice = async (userId) => {
  const today = await pool.query(
    `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM sales WHERE sale_date=CURRENT_DATE AND status='completed'`
  );
  const month = await pool.query(
    `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM sales WHERE DATE_TRUNC('month',sale_date)=DATE_TRUNC('month',CURRENT_DATE) AND status='completed'`
  );
  return { success: true, type: 'sales_summary', today: today.rows[0], month: month.rows[0] };
};

const generateHinglishResponse = async (intent, result, originalText) => {
  if (result.error) return result.message;

  const contextMap = {
    'RECORD_UDHAR': `Udhar recorded: ${result.customer} ko ₹${result.amount}. Total outstanding: ₹${result.total_outstanding}`,
    'CREATE_SALE': `Sale created: ${result.customer} ke liye ₹${result.amount}`,
    'RECORD_PAYMENT': `Payment recorded: ${result.customer} se ₹${result.amount}. Remaining balance: ₹${result.remaining_balance}`,
    'CHECK_BALANCE': `Balance for ${result.customer}: ₹${result.outstanding}`,
    'CHECK_SALES': `Today: ${result.today?.count} sales, ₹${result.today?.total}. This month: ${result.month?.count} sales, ₹${result.month?.total}`,
  };

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a friendly Hindi/English (Hinglish) CRM assistant for Indian shopkeepers.
Generate a short, natural, conversational response in Hinglish (max 25 words).
Use rupee symbol ₹ for amounts. Be warm and helpful. No emojis.`
        },
        { role: 'user', content: `Context: ${contextMap[intent] || JSON.stringify(result)}. Generate response.` }
      ],
      max_tokens: 60,
      temperature: 0.7,
    });
    return completion.choices[0].message.content;
  } catch {
    return contextMap[intent] || 'Done!';
  }
};

// ─── 2. AI CHATBOT ───────────────────────────────────────────────────────────

const getChatResponse = async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || messages.length === 0) return res.status(400).json({ error: 'Messages required' });

    const systemPrompt = `You are a helpful, friendly CRM assistant for Indian small businesses.
Help users use this CRM system. Respond in the same language as the user (Hindi/English/Hinglish).
Be concise (max 80 words), practical, and encouraging.

CRM Features:
- Dashboard: Business overview, revenue, costs, profit
- Udhar Khata (Credit Book): Track outstanding payments, record credit given
- Sales: Record completed sales
- Customers: Manage customer database
- Opportunities: Track potential deals in pipeline
- Follow-ups: Schedule and track customer follow-ups
- Proposals: Create and send proposals
- Reports: Detailed analytics

Common tasks:
- "Udhar kaise darj karein?" → Udhar Khata page pe jaayein, "+ Udhar Darj Karein" button click karein
- "Naya customer kaise banayein?" → Customers page, "+ Add Customer"
- "Sale kaise record karein?" → Sales page, "+ Add Sale"
- "Balance check kaise karein?" → Udhar Khata page pe saari outstanding dikhegi

Always end with: "Aur kuch help chahiye?" (if Hindi) or "Need help with anything else?" (if English)`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10), // last 10 messages for context
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ response: 'Abhi chatbot available nahi hai. Thodi der baad try karein.' });
  }
};

// ─── 3. SMART PAYMENT REMINDER ───────────────────────────────────────────────

const generateSmartReminder = async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId required' });

    const cacheKey = `reminder-${customerId}-${new Date().toDateString()}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const customerRes = await pool.query('SELECT * FROM customers WHERE id=$1', [customerId]);
    if (customerRes.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

    const customer = customerRes.rows[0];

    const outstandingRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count,
              MIN(sale_date) as oldest_date
       FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending'`,
      [customerId]
    );

    const { total: amount, count: invoiceCount, oldest_date } = outstandingRes.rows[0];

    if (parseFloat(amount) === 0) {
      return res.json({ message: `${customer.company_name} ka koi outstanding nahi hai!`, amount: 0 });
    }

    const daysPending = oldest_date
      ? Math.floor((Date.now() - new Date(oldest_date)) / 86400000)
      : 0;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Generate a WhatsApp payment reminder for an Indian small business owner.
Write in Hinglish (Hindi + English mix).
Rules:
- Amount < ₹5,000: Very casual, friendly tone
- Amount ₹5,000-₹50,000: Polite and professional
- Amount > ₹50,000: More formal but still respectful
- Days pending < 7: Very gentle reminder
- Days pending 7-30: Standard reminder
- Days pending > 30: Firmer but always respectful
- Use Indian cultural norms (respect relationships)
- Keep under 80 words
- Include exact amount with ₹ symbol
- End with gratitude
- Do NOT use emojis`
        },
        {
          role: 'user',
          content: `Customer: ${customer.company_name} (${customer.contact_person})
Outstanding amount: ₹${parseFloat(amount).toLocaleString('en-IN')}
Pending invoices: ${invoiceCount}
Days since oldest invoice: ${daysPending} days
Generate reminder message.`
        }
      ],
      max_tokens: 150,
      temperature: 0.8,
    });

    const message = completion.choices[0].message.content;
    const now = new Date();
    const day = now.getDay();
    let suggestedTime = 'Tomorrow morning (10-11 AM)';
    if (day === 5) suggestedTime = 'Friday afternoon (4-5 PM) - before weekend';
    else if (day === 6) suggestedTime = 'Monday morning (10-11 AM)';
    else if (day === 0) suggestedTime = 'Tomorrow morning (Monday, 10-11 AM)';

    const phone = customer.phone?.replace(/[^0-9]/g, '');
    const whatsappLink = phone ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}` : null;

    const result = {
      message,
      amount: parseFloat(amount),
      invoiceCount,
      daysPending,
      suggestedTime,
      customerName: customer.company_name,
      whatsappLink,
    };

    cache.set(cacheKey, result, 1800); // cache 30 min
    res.json(result);
  } catch (error) {
    console.error('Smart reminder error:', error);
    res.status(500).json({ error: 'Failed to generate reminder' });
  }
};

// ─── 4. DATA ENTRY SUGGESTIONS (DB-based, no OpenAI cost) ────────────────────

const suggestDataEntry = async (req, res) => {
  try {
    const { field, context = {}, partialInput = '' } = req.body;
    let suggestions = [];

    switch (field) {
      case 'customer': {
        const result = await pool.query(
          `SELECT c.id, c.company_name, c.contact_person, c.phone,
                  COUNT(s.id) as order_count,
                  MAX(s.created_at) as last_order
           FROM customers c
           LEFT JOIN sales s ON c.id = s.customer_id
           WHERE LOWER(c.company_name) LIKE LOWER($1) OR LOWER(c.contact_person) LIKE LOWER($1)
           GROUP BY c.id
           ORDER BY order_count DESC, last_order DESC NULLS LAST
           LIMIT 6`,
          [`%${partialInput}%`]
        );
        suggestions = result.rows.map(c => ({
          value: c.id,
          label: c.company_name,
          subtitle: `${c.contact_person}${c.phone ? ' · ' + c.phone : ''} · ${c.order_count} orders`,
          confidence: parseInt(c.order_count) > 3 ? 'high' : 'medium',
        }));
        break;
      }
      case 'product': {
        const q = partialInput
          ? `SELECT description as product, COUNT(*) as freq FROM sales
             WHERE ${context.customerId ? 'customer_id=$1 AND' : ''} LOWER(description) LIKE LOWER($${context.customerId ? 2 : 1})
             GROUP BY description ORDER BY freq DESC LIMIT 5`
          : `SELECT description as product, COUNT(*) as freq FROM sales
             ${context.customerId ? 'WHERE customer_id=$1' : ''}
             GROUP BY description ORDER BY freq DESC LIMIT 5`;

        const params = context.customerId
          ? partialInput ? [context.customerId, `%${partialInput}%`] : [context.customerId]
          : partialInput ? [`%${partialInput}%`] : [];

        const result = await pool.query(q, params);
        suggestions = result.rows.map(p => ({
          value: p.product,
          label: p.product,
          subtitle: `${p.freq} times before`,
          confidence: parseInt(p.freq) > 2 ? 'high' : 'medium',
        }));
        break;
      }
      case 'amount': {
        if (context.customerId) {
          const result = await pool.query(
            `SELECT ROUND(AVG(amount)) as avg_amount, MAX(amount) as max_amount, MIN(amount) as min_amount
             FROM sales WHERE customer_id=$1 AND status='completed'`,
            [context.customerId]
          );
          const row = result.rows[0];
          if (row.avg_amount) {
            suggestions = [
              { value: row.avg_amount, label: `₹${parseInt(row.avg_amount).toLocaleString('en-IN')}`, subtitle: 'Usual amount', confidence: 'high' },
              { value: row.max_amount, label: `₹${parseInt(row.max_amount).toLocaleString('en-IN')}`, subtitle: 'Highest amount', confidence: 'medium' },
            ];
          }
        }
        break;
      }
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestion error:', error);
    res.json({ suggestions: [] });
  }
};

// ─── 5. CONVERSATIONAL ANALYTICS ─────────────────────────────────────────────

const conversationalAnalytics = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    const cacheKey = `analytics-${question.toLowerCase().trim()}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Generate SQL from natural language
    const planning = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You convert natural language business questions to safe PostgreSQL queries for a CRM database.

Tables:
- customers (id, company_name, contact_person, phone, city, sector, status)
- sales (id, customer_id, amount, status, payment_method, description, sale_date)
- costs (id, amount, category, description, cost_date)
- opportunities (id, customer_id, value, pipeline_stage, closing_probability, expected_close_date)
- followups (id, opportunity_id, followup_type, status, followup_date)

Rules:
- ONLY generate SELECT queries, never INSERT/UPDATE/DELETE
- Always use COALESCE for aggregations
- For "udhar" or "outstanding" use: sales WHERE payment_method='udhar' AND status='pending'
- For "revenue" use: sales WHERE status='completed'
- Limit results to 10 rows max

Respond ONLY in JSON: {"sql": "...", "visualization": "bar|pie|line|number|table", "title": "chart title in Hinglish"}`
        },
        { role: 'user', content: question }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const plan = JSON.parse(planning.choices[0].message.content);

    // Safety: block non-SELECT queries
    if (!plan.sql.trim().toLowerCase().startsWith('select')) {
      return res.status(400).json({ error: 'Only SELECT queries allowed' });
    }

    const queryResult = await pool.query(plan.sql);

    // Generate natural language answer
    const answerCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You explain business data to an Indian small business owner in simple Hinglish.
Be conversational, highlight the most important insight first. Max 50 words. Use ₹ for money.`
        },
        {
          role: 'user',
          content: `Question: "${question}"\nData: ${JSON.stringify(queryResult.rows.slice(0, 5))}\nExplain simply in Hinglish.`
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const result = {
      answer: answerCompletion.choices[0].message.content,
      data: queryResult.rows,
      visualization: plan.visualization,
      title: plan.title,
      rowCount: queryResult.rowCount,
    };

    cache.set(cacheKey, result, 300); // 5 min cache
    res.json(result);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Abhi ye feature available nahi hai. Dobara try karein.' });
  }
};

module.exports = {
  processVoiceCommand,
  getChatResponse,
  generateSmartReminder,
  suggestDataEntry,
  conversationalAnalytics,
};
