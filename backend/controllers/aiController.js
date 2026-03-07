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

// ─── 1. VOICE COMMAND — GPT-4o with Function Calling ────────────────────────

const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'record_udhar',
      description: 'Customer ko udhar/credit dena — maal ya service di aur payment baad mein milegi. Credit Book mein entry hoti hai.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer ka naam' },
          amount: { type: 'number', description: 'Amount rupees mein (Hindi numbers bhi: paanch hazaar = 5000)' },
          product: { type: 'string', description: 'Kya diya gaya — maal, cement, kapda, etc. (optional)' },
          quantity: { type: 'number', description: 'Kitna diya (optional)' },
        },
        required: ['customer_name', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_sale',
      description: 'Cash sale record karna — jab customer ne turant paise diye ho',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          amount: { type: 'number' },
          product: { type: 'string', description: 'Kya becha (optional)' },
        },
        required: ['customer_name', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_payment',
      description: 'Customer ne udhar ke paise waapis diye — payment receive karna',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          amount: { type: 'number' },
        },
        required: ['customer_name', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_balance',
      description: 'Kisi customer ka outstanding udhar/balance check karna',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
        },
        required: ['customer_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_sales',
      description: 'Aaj ya is mahine ki sales ka summary dekhna',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'month', 'week'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_customer',
      description: 'Naya customer database mein add karna — sirf naam se, baaki details baad mein',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Customer ya company ka naam' },
          phone: { type: 'string', description: 'Phone number (optional)' },
        },
        required: ['name'],
      },
    },
  },
];

const VOICE_SYSTEM_PROMPT = `Tu ek samajhdar aur dosti bhara CRM assistant hai jo Indian chhote dukandaaron ki madad karta hai — kirana store, kapde ki dukaan, hardware, construction, koi bhi.

Tu Hindi, English, aur Hinglish teeno samajhta hai. Jo bhaasha user bole, usi mein jawab de.

Tere paas ye tools hain: udhar darj karna, cash sale record karna, payment lena, balance check karna, naya customer banana.

Bahut zaroori rules:
• Responses CHHOTE rakho — 1-2 sentences maximum
• Amounts mein ₹ sign use karo, Indian format mein (₹5,000 na ki 5000)
• Jab koi kaam ho jaaye, clearly batao kya hua
• Jab customer database mein nahi mile, toh seedha poochho — "Kya main [naam] ko naya customer ke roop mein add kar doon?"
• Jab zaroori information missing ho, sirf woh ek cheez poochho
• Bilkul formal mat bano — jaise dukaan ka koi dost baat kar raha ho

Hindi numbers ka gyaan:
paanch sau = 500 | ek hazaar = 1000 | paanch hazaar = 5000 | das hazaar = 10,000 | paanch das hazaar = 50,000 | ek lakh = 1,00,000 | do lakh = 2,00,000`;

// Execute a tool call and return result string for GPT
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
        status: 'success',
        action: 'udhar_recorded',
        customer: c.company_name,
        amount: args.amount,
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
           VALUES ($1, $2, 'Payment received (Voice entry)', 'completed', CURRENT_DATE, $3, $4)`,
          [c.id, args.amount, inv, userId]
        );
      }
      const remaining = await pool.query(
        `SELECT COALESCE(SUM(amount),0) as total FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending'`,
        [c.id]
      );
      return JSON.stringify({
        status: 'success',
        action: 'payment_recorded',
        customer: c.company_name,
        amount: args.amount,
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
          return JSON.stringify({ status: 'already_exists', customer: existing[0].company_name });
        }
        await pool.query(
          `INSERT INTO customers (company_name, contact_person, status, created_by) VALUES ($1, $1, 'active', $2)`,
          [args.name, userId]
        );
        return JSON.stringify({ status: 'success', action: 'customer_created', customer: args.name });
      } catch (e) {
        return JSON.stringify({ status: 'error', message: e.message });
      }
    }

    default:
      return JSON.stringify({ status: 'error', message: 'Unknown tool' });
  }
};

const processVoiceCommand = async (req, res) => {
  try {
    const { text, messages: clientMessages = [] } = req.body;
    const userId = req.user.id;

    if (!text?.trim()) return res.status(400).json({ error: 'Text required' });

    // Build conversation: system + history (user/assistant only) + new user message
    const messages = [
      { role: 'system', content: VOICE_SYSTEM_PROMPT },
      ...clientMessages.slice(-10), // last 5 turns (user+assistant pairs)
      { role: 'user', content: text },
    ];

    // Agentic loop — GPT calls tools until it has a final text answer
    for (let i = 0; i < 6; i++) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: AI_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 200,
      });

      const choice = completion.choices[0];
      messages.push(choice.message);

      // No tool call — GPT has a final text response
      if (!choice.message.tool_calls?.length) {
        const responseText = choice.message.content;

        // Return updated history (user/assistant text only, strip tool messages for client)
        const cleanHistory = messages
          .slice(1) // remove system
          .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-12);

        return res.json({ response: responseText, messages: cleanHistory, success: true });
      }

      // Execute each tool call and add results
      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args, userId);
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
      }
    }

    return res.json({ response: 'Maafi chahta hun, kuch samajh nahi aaya. Dobara bolein please.', success: false });
  } catch (error) {
    console.error('[AI] Voice command error:', error.message);
    res.status(500).json({ response: safeError(error), success: false });
  }
};

// ─── 2. AI CHATBOT ───────────────────────────────────────────────────────────

const getChatResponse = async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages?.length) return res.status(400).json({ error: 'Messages required' });

    const systemPrompt = `Tu ek helpful CRM assistant hai jo Indian chhote business owners ki madad karta hai.
Jo bhaasha user bole (Hindi/English/Hinglish), usi mein jawab de. Chhota aur kaam ki baat karo — max 3 sentences.

CRM features: Dashboard, Udhar Khata (Credit Book), Sales, Customers, Opportunities, Follow-ups, Proposals, Reports.

Common help:
- Udhar darj karna → Udhar Khata → "+ Udhar Darj Karein"
- Naya customer → Customers → "+ Add Customer"  
- Sale record → Sales → "+ Add Sale"
- Outstanding balance → Udhar Khata page

Hamesha ek aur cheez offer karo help ke liye.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10),
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('[AI] Chat error:', error.message);
    res.status(500).json({ response: safeError(error) });
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
    if (!customerRes.rows.length) return res.status(404).json({ error: 'Customer not found' });
    const customer = customerRes.rows[0];

    const outstandingRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, MIN(sale_date) as oldest_date
       FROM sales WHERE customer_id=$1 AND payment_method='udhar' AND status='pending'`,
      [customerId]
    );
    const { total: amount, count: invoiceCount, oldest_date } = outstandingRes.rows[0];

    if (parseFloat(amount) === 0) {
      return res.json({ message: `${customer.company_name} ka koi outstanding nahi hai!`, amount: 0 });
    }

    const daysPending = oldest_date ? Math.floor((Date.now() - new Date(oldest_date)) / 86400000) : 0;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Tu ek Indian chhote business owner ki taraf se WhatsApp payment reminder likhta hai.
Hinglish mein likho — natural, respectful, aur tone amount + days ke hisaab se rakho:
- Amount < ₹5,000: bahut casual aur dosti bhara
- Amount ₹5,000-₹50,000: polite aur professional
- Amount > ₹50,000: formal lekin izzat ke saath
- 0-7 days: bahut gentle
- 7-30 days: standard reminder  
- 30+ days: thoda firm lekin respectful
Max 80 words. ₹ symbol use karo. Gratitude se khatam karo. Emojis mat use karo.`,
        },
        {
          role: 'user',
          content: `Customer: ${customer.company_name} (${customer.contact_person})
Outstanding: ₹${parseFloat(amount).toLocaleString('en-IN')}
Pending bills: ${invoiceCount}
Days since oldest: ${daysPending}
WhatsApp reminder likho.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.8,
    });

    const message = completion.choices[0].message.content;
    const day = new Date().getDay();
    let suggestedTime = 'Kal subah 10-11 baje';
    if (day === 5) suggestedTime = 'Aaj shaam 4-5 baje (weekend se pehle)';
    else if (day === 6 || day === 0) suggestedTime = 'Somvar subah 10-11 baje';

    const phone = customer.phone?.replace(/[^0-9]/g, '');
    const whatsappLink = phone
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
      : null;

    const result = { message, amount: parseFloat(amount), invoiceCount, daysPending, suggestedTime, customerName: customer.company_name, whatsappLink };
    cache.set(cacheKey, result, 1800);
    res.json(result);
  } catch (error) {
    console.error('[AI] Smart reminder error:', error.message);
    res.status(500).json({ error: safeError(error) });
  }
};

// ─── 4. DATA ENTRY SUGGESTIONS (DB-based, no OpenAI) ────────────────────────

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
          confidence: parseInt(c.order_count) > 3 ? 'high' : 'medium',
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
        suggestions = r.rows.map(p => ({ value: p.product, label: p.product, subtitle: `${p.freq} times before` }));
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
              { value: r.rows[0].avg, label: `₹${parseInt(r.rows[0].avg).toLocaleString('en-IN')}`, subtitle: 'Usual amount', confidence: 'high' },
              { value: r.rows[0].max, label: `₹${parseInt(r.rows[0].max).toLocaleString('en-IN')}`, subtitle: 'Highest amount', confidence: 'medium' },
            ];
          }
        }
        break;
      }
    }
    res.json({ suggestions });
  } catch (error) {
    console.error('[AI] Suggestion error:', error.message);
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

    const planning = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Convert natural language business questions to safe PostgreSQL SELECT queries for a CRM.

Tables: customers(id,company_name,contact_person,phone,city,sector,status), sales(id,customer_id,amount,status,payment_method,description,sale_date), costs(id,amount,category,description,cost_date), opportunities(id,customer_id,value,pipeline_stage,closing_probability,expected_close_date)

Rules: ONLY SELECT. For udhar/outstanding: WHERE payment_method='udhar' AND status='pending'. For revenue: WHERE status='completed'. LIMIT 10.

Respond ONLY in JSON: {"sql":"...","visualization":"bar|pie|line|number|table","title":"chart title"}`,
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
          content: `Ek Indian chhote business owner ko unke business data ke baare mein simply samjhao. Hinglish mein, max 50 words. ₹ symbol use karo. Sabse important insight pehle batao.`,
        },
        { role: 'user', content: `Question: "${question}"\nData: ${JSON.stringify(queryResult.rows.slice(0, 5))}` },
      ],
      max_tokens: 120,
      temperature: 0.7,
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
