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

// ─── DEVANAGARI → ROMAN TRANSLITERATION ─────────────────────────────────────

const isDevanagari = (str) => /[\u0900-\u097F]/.test(str);

const transliterateHindi = (text) => {
  const vowels = {
    'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ऋ':'ri',
    'ए':'e','ऐ':'ai','ओ':'o','औ':'au',
  };
  const consonants = {
    'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng',
    'च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny',
    'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n',
    'त':'t','थ':'th','द':'d','ध':'dh','न':'n',
    'प':'p','फ':'f','ब':'b','भ':'bh','म':'m',
    'य':'y','र':'r','ल':'l','व':'v',
    'श':'sh','ष':'sh','स':'s','ह':'h',
  };
  const matras = {
    'ा':'a','ि':'i','ी':'ee','ु':'u','ू':'oo',
    'े':'e','ै':'ai','ो':'o','ौ':'au',
  };

  const chars = [...text];
  let result = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (vowels[ch]) {
      result += vowels[ch];
    } else if (consonants[ch]) {
      result += consonants[ch];
      if (next === '\u094D') {        // halant — no implicit vowel
        i++;
      } else if (next && matras[next]) {
        result += matras[next];
        i++;
      } else {
        result += 'a';               // implicit schwa
      }
    } else if (ch === '\u0902') {     // anusvara ं
      result += 'n';
    } else if (ch === '\u0903') {     // visarga ः
      result += 'h';
    } else if (ch === '\u094D' || ch === '\u093C' || ch === '\u0901') {
      // halant, nukta, chandrabindu — skip
    } else {
      result += ch;
    }
  }

  return result.replace(/a$/, '');    // drop trailing schwa
};

// ─── DB HELPERS ──────────────────────────────────────────────────────────────

const findCustomer = async (name) => {
  const searchName = isDevanagari(name) ? transliterateHindi(name) : name;

  // Exact / LIKE match first
  const exact = await pool.query(
    `SELECT id, company_name, contact_person, phone FROM customers
     WHERE LOWER(company_name) LIKE LOWER($1) OR LOWER(contact_person) LIKE LOWER($1)
     ORDER BY CASE WHEN LOWER(company_name)=LOWER($2) OR LOWER(contact_person)=LOWER($2) THEN 0 ELSE 1 END
     LIMIT 3`,
    [`%${searchName}%`, searchName]
  );
  if (exact.rows.length) return { matches: exact.rows, type: 'exact' };

  // Fuzzy fallback — try first 3+ chars prefix match
  const prefix = searchName.length >= 3 ? searchName.slice(0, 3) : searchName;
  const fuzzy = await pool.query(
    `SELECT id, company_name, contact_person, phone FROM customers
     WHERE LOWER(company_name) LIKE LOWER($1) OR LOWER(contact_person) LIKE LOWER($1)
     ORDER BY company_name LIMIT 5`,
    [`${prefix}%`]
  );
  if (fuzzy.rows.length) return { matches: fuzzy.rows, type: 'fuzzy' };

  // Last resort — get all customers for suggestion (small business = few customers)
  const all = await pool.query(
    `SELECT id, company_name, contact_person, phone FROM customers
     WHERE status = 'active' ORDER BY company_name LIMIT 20`
  );
  // Simple string distance: count matching characters
  const scored = all.rows.map(c => {
    const cn = c.company_name.toLowerCase();
    const sn = searchName.toLowerCase();
    let score = 0;
    for (let i = 0; i < Math.min(cn.length, sn.length); i++) {
      if (cn[i] === sn[i]) score += 2;
      else if (cn.includes(sn[i])) score += 1;
    }
    return { ...c, score };
  }).filter(c => c.score > 1).sort((a, b) => b.score - a.score).slice(0, 3);

  if (scored.length) return { matches: scored, type: 'fuzzy' };
  return { matches: [], type: 'none' };
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
          customer_name: { type: 'string', description: 'Customer name (any script — Hindi or English both accepted)' },
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
          customer_name: { type: 'string', description: 'Customer name (any script — Hindi or English both accepted)' },
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
          customer_name: { type: 'string', description: 'Customer name (any script — Hindi or English both accepted)' },
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
          customer_name: { type: 'string', description: 'Customer name (any script — Hindi or English both accepted)' },
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
      name: 'check_customers',
      description: 'Get total number of customers, list of customer names, or customers with outstanding udhar balance.',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['all', 'with_udhar', 'top_outstanding'], description: 'all = total count and list, with_udhar = only customers who owe money, top_outstanding = top 5 by balance' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'business_summary',
      description: 'Get a full business overview — total revenue, costs, profit, outstanding udhar, customer count, and recent activity.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_followup',
      description: 'Create a follow-up reminder. Can be linked to a customer OR created as generic "other" type. Can set WhatsApp reminder type to send message automatically at scheduled time.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer name (optional - if not provided, creates generic "other" type followup). Hindi or English both accepted.' },
          followup_date: { type: 'string', description: 'When to follow up - format: YYYY-MM-DD HH:MM or natural language like "tomorrow 2pm", "aaj 9 bje" (today 9), "next monday 10am"' },
          followup_type: { type: 'string', enum: ['call', 'email', 'meeting', 'whatsapp_reminder'], description: 'Type of follow-up. Use whatsapp_reminder to send automatic WhatsApp message' },
          notes: { type: 'string', description: 'Reminder notes - what to follow up about' },
        },
        required: ['followup_date', 'followup_type'],
      },
    },
  },
];

// ─── SYSTEM PROMPT — in English, let GPT naturally handle Hindi ──────────────

const VOICE_SYSTEM_PROMPT = `You are a CRM assistant for an Indian small business. Reply naturally in the user's language. Use ₹ for amounts. Keep responses short.

RULE 1 — ALWAYS USE TOOLS: When the user mentions a customer name or asks about data, you MUST call the appropriate tool. NEVER reply about customer data without calling a tool first. Pass names in any script — the system handles transliteration.

RULE 2 — Follow-ups: When user says "haan/yes/kar do" etc., look at conversation history for context. Never re-ask for information already mentioned.

RULE 3 — Customer not found: You CANNOT add new customers. If a tool returns customer_not_found:
  - If the tool returns "suggestions" (similar names), show them to the user and ask "Did you mean one of these?" Let the user pick.
  - If no suggestions, tell the user immediately: "This customer is not in the system. Please add them from the Customers page first."
  - NEVER offer to create customers yourself.
  - FOR FOLLOW-UPS ONLY: If customer not found but user wants a generic reminder (like "kushal ko phone karna hai"), create a follow-up WITHOUT customer (customer_name can be omitted). This creates an "other" type follow-up.

RULE 4 — Fuzzy names: If the user gives an unclear or partial name, STILL call the tool — the system does fuzzy matching and will return close matches if any.

Available actions: record udhar, record cash sales, record payments, check balances, check sales, check customers (count/list/who owes), business summary (revenue/profit/outstanding this month).`;

// ─── Execute tool call ───────────────────────────────────────────────────────

const customerNotFound = (searchedName, result) => {
  if (result.type === 'fuzzy' && result.matches.length) {
    return JSON.stringify({
      status: 'customer_not_found',
      searched_name: searchedName,
      suggestions: result.matches.map(c => c.company_name),
      message: `"${searchedName}" not found. Similar customers: ${result.matches.map(c => c.company_name).join(', ')}. Ask user which one they meant.`,
    });
  }
  return JSON.stringify({
    status: 'customer_not_found',
    searched_name: searchedName,
    suggestions: [],
    message: `"${searchedName}" is not in the system. User must add them from the Customers page first.`,
  });
};

const resolveCustomer = async (name) => {
  const result = await findCustomer(name);
  if (result.type === 'exact' && result.matches.length) return { customer: result.matches[0], ok: true };
  return { customer: null, ok: false, result };
};

const executeTool = async (name, args, userId, adminWhatsappPhone = null) => {
  switch (name) {
    case 'record_udhar': {
      const { customer: c, ok, result } = await resolveCustomer(args.customer_name);
      if (!ok) return customerNotFound(args.customer_name, result);
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
      const { customer: c, ok, result } = await resolveCustomer(args.customer_name);
      if (!ok) return customerNotFound(args.customer_name, result);
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
      const { customer: c, ok, result } = await resolveCustomer(args.customer_name);
      if (!ok) return customerNotFound(args.customer_name, result);
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
      const { customer: c, ok, result } = await resolveCustomer(args.customer_name);
      if (!ok) return customerNotFound(args.customer_name, result);
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

    case 'check_customers': {
      const filter = args.filter || 'all';
      if (filter === 'all') {
        const r = await pool.query(
          `SELECT id, company_name, contact_person, phone FROM customers WHERE status='active' ORDER BY company_name`
        );
        return JSON.stringify({
          status: 'success',
          total: r.rows.length,
          customers: r.rows.map(c => c.company_name),
        });
      }
      if (filter === 'with_udhar') {
        const r = await pool.query(
          `SELECT c.company_name, COALESCE(SUM(s.amount),0) as outstanding
           FROM customers c
           JOIN sales s ON s.customer_id=c.id
           WHERE s.payment_method='udhar' AND s.status='pending'
           GROUP BY c.company_name
           ORDER BY outstanding DESC`
        );
        return JSON.stringify({
          status: 'success',
          total: r.rows.length,
          customers: r.rows.map(c => ({ name: c.company_name, outstanding: parseFloat(c.outstanding) })),
        });
      }
      if (filter === 'top_outstanding') {
        const r = await pool.query(
          `SELECT c.company_name, COALESCE(SUM(s.amount),0) as outstanding
           FROM customers c
           JOIN sales s ON s.customer_id=c.id
           WHERE s.payment_method='udhar' AND s.status='pending'
           GROUP BY c.company_name
           ORDER BY outstanding DESC
           LIMIT 5`
        );
        return JSON.stringify({
          status: 'success',
          customers: r.rows.map(c => ({ name: c.company_name, outstanding: parseFloat(c.outstanding) })),
        });
      }
      break;
    }

    case 'business_summary': {
      const [rev, costs, customers, udhar, todaySales] = await Promise.all([
        pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM sales WHERE status='completed' AND DATE_TRUNC('month',sale_date)=DATE_TRUNC('month',CURRENT_DATE)`),
        pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM costs WHERE payment_status='paid' AND DATE_TRUNC('month',cost_date)=DATE_TRUNC('month',CURRENT_DATE)`),
        pool.query(`SELECT COUNT(*) as total FROM customers WHERE status='active'`),
        pool.query(`SELECT COALESCE(SUM(amount),0) as total, COUNT(DISTINCT customer_id) as count FROM sales WHERE payment_method='udhar' AND status='pending'`),
        pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM sales WHERE sale_date=CURRENT_DATE AND status='completed'`),
      ]);
      return JSON.stringify({
        status: 'success',
        this_month: {
          revenue: parseFloat(rev.rows[0].total),
          costs: parseFloat(costs.rows[0].total),
          profit: parseFloat(rev.rows[0].total) - parseFloat(costs.rows[0].total),
        },
        today_sales: { count: parseInt(todaySales.rows[0].count), total: parseFloat(todaySales.rows[0].total) },
        total_customers: parseInt(customers.rows[0].total),
        total_outstanding: parseFloat(udhar.rows[0].total),
        customers_with_udhar: parseInt(udhar.rows[0].count),
      });
    }

    case 'create_followup': {
      // Customer is OPTIONAL - if not provided, create "other" type followup
      let customerId = null;
      let customerName = 'Other';
      
      if (args.customer_name) {
        const { customer: c, ok, result } = await resolveCustomer(args.customer_name);
        if (!ok) return customerNotFound(args.customer_name, result);
        customerId = c.id;
        customerName = c.company_name;
      }
      
      // Parse followup date - handle natural language
      let followupDate = args.followup_date;
      
      // Simple natural language parsing for common cases
      const now = new Date();
      const lower = followupDate.toLowerCase();
      
      // Helper function to parse time and choose next occurrence
      const parseTimeSmartly = (dateObj, timeStr) => {
        // Match patterns like "9", "9.15", "9:15", "9 bje", with optional AM/PM
        const timeMatch = timeStr.match(/(\d+)[:.](\d+)\s*(am|pm|bje)?|(\d+)\s*(am|pm|bje)?/);
        if (!timeMatch) return dateObj;
        
        let hour, minute = 0;
        const hasAmPm = timeMatch[3] === 'am' || timeMatch[3] === 'pm' || timeMatch[5] === 'am' || timeMatch[5] === 'pm';
        
        if (timeMatch[1]) {
          // Format like "9:15" or "9.15"
          hour = parseInt(timeMatch[1]);
          minute = parseInt(timeMatch[2]);
          const ampm = timeMatch[3];
          if (ampm === 'pm' && hour !== 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
        } else {
          // Format like "9"
          hour = parseInt(timeMatch[4]);
          const ampm = timeMatch[5];
          if (ampm === 'pm' && hour !== 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
        }
        
        // If no AM/PM specified, choose the NEXT upcoming occurrence
        if (!hasAmPm) {
          const currentHour = now.getHours();
          // If the hour has passed today, use PM (add 12), otherwise use the hour as-is
          if (hour < 12 && hour <= currentHour) {
            // Hour has passed or is current - try PM
            hour += 12;
          }
          // If still in the past (like 9 PM when it's 10 PM), it means tomorrow
          if (hour < currentHour || (hour === currentHour && now.getMinutes() >= minute)) {
            dateObj.setDate(dateObj.getDate() + 1);
          }
        }
        
        dateObj.setHours(hour, minute, 0, 0);
        return dateObj;
      };
      
      if (lower.includes('tomorrow') || lower.includes('kal')) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        followupDate = parseTimeSmartly(tomorrow, lower).toISOString();
      } else if (lower.includes('next week') || lower.includes('next monday')) {
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(10, 0, 0, 0);
        followupDate = nextWeek.toISOString();
      } else if (lower.includes('today') || lower.includes('aaj')) {
        const today = new Date(now);
        followupDate = parseTimeSmartly(today, lower).toISOString();
      }
      // Otherwise use the date as-is (should be ISO format from AI)
      
      // Use admin's WhatsApp phone if provided (from WhatsApp conversation)
      // This way admin gets reminder in same WhatsApp chat where they created the followup
      const adminPhone = args.followup_type === 'whatsapp_reminder' ? adminWhatsappPhone : null;
      
      const followupResult = await pool.query(
        `INSERT INTO followups 
         (customer_id, assigned_to, followup_date, followup_type, status, notes, admin_whatsapp_phone, created_by)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
         RETURNING id, followup_date`,
        [customerId, userId, followupDate, args.followup_type, args.notes || '', adminPhone, userId]
      );
      
      return JSON.stringify({
        status: 'success',
        action: 'followup_created',
        customer: customerName,
        followup_id: followupResult.rows[0].id,
        followup_type: args.followup_type,
        scheduled_for: followupResult.rows[0].followup_date,
        whatsapp_enabled: args.followup_type === 'whatsapp_reminder',
      });
    }

    default:
      return JSON.stringify({ status: 'error', message: 'Unknown tool' });
  }
};

// ─── Build clean history with tool action summaries ─────────────────────────

const summarizeToolResult = (toolName, args, resultJson) => {
  try {
    const r = JSON.parse(resultJson);
    if (r.status === 'customer_not_found') {
      const sugg = r.suggestions?.length ? ` Similar: ${r.suggestions.join(', ')}` : '';
      return `[Looked up "${args.customer_name || args.name}" → not found.${sugg}]`;
    }
    if (r.status === 'success') {
      switch (r.action) {
        case 'udhar_recorded': return `[Recorded ₹${r.amount} udhar for ${r.customer}, total outstanding: ₹${r.total_outstanding}]`;
        case 'sale_recorded': return `[Recorded ₹${r.amount} cash sale for ${r.customer}]`;
        case 'payment_recorded': return `[Recorded ₹${r.amount} payment from ${r.customer}, remaining: ₹${r.remaining_balance}]`;
        case 'followup_created': return `[Created ${r.followup_type} follow-up for ${r.customer} on ${new Date(r.scheduled_for).toLocaleString('en-IN')}${r.whatsapp_enabled ? ' (WhatsApp reminder enabled)' : ''}]`;
        default: break;
      }
      if (r.outstanding !== undefined) return `[${r.customer} outstanding: ₹${r.outstanding}]`;
      if (r.today) return `[Today: ${r.today.count} sales, ₹${r.today.total} | Month: ${r.month.count} sales, ₹${r.month.total}]`;
      if (r.total_customers !== undefined) return `[Business: ${r.total_customers} customers, ₹${r.this_month?.revenue} revenue this month, ₹${r.total_outstanding} total udhar]`;
      if (r.total !== undefined && r.customers) return `[${r.total} customers: ${r.customers?.slice(0,5).join(', ')}]`;
    }
    return `[${toolName}: ${r.status}]`;
  } catch { return `[${toolName} completed]`; }
};

const buildCleanHistory = (messages) => {
  const clean = [];
  const raw = messages.slice(1); // skip system

  for (let i = 0; i < raw.length; i++) {
    const m = raw[i];
    if (m.role === 'user') {
      clean.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      if (m.tool_calls?.length) {
        const summaries = [];
        for (const tc of m.tool_calls) {
          const args = JSON.parse(tc.function.arguments || '{}');
          const toolResult = raw.find(tm => tm.role === 'tool' && tm.tool_call_id === tc.id);
          summaries.push(summarizeToolResult(tc.function.name, args, toolResult?.content || '{}'));
        }
        clean.push({ role: 'assistant', content: summaries.join('\n') });
      } else if (typeof m.content === 'string') {
        clean.push({ role: 'assistant', content: m.content });
      }
    }
    // tool messages are already covered by summaries above
  }

  return clean.slice(-14);
};

// ─── SHARED AGENTIC LOOP (reused by portal + WhatsApp) ──────────────────────

const runAgenticLoop = async (systemPrompt, historyMessages, userText, userId, adminWhatsappPhone = null) => {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMessages.slice(-12),
    { role: 'user', content: userText },
  ];

  for (let i = 0; i < 8; i++) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: AI_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 400,
    });

    const choice = completion.choices[0];
    messages.push(choice.message);

    if (!choice.message.tool_calls?.length) {
      return {
        response: choice.message.content,
        cleanHistory: buildCleanHistory(messages),
      };
    }

    for (const toolCall of choice.message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await executeTool(toolCall.function.name, args, userId, adminWhatsappPhone);
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
    }
  }

  return { response: 'Thoda aur detail mein batao — kya karna hai?', cleanHistory: [] };
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

    const { response, cleanHistory } = await runAgenticLoop(VOICE_SYSTEM_PROMPT, clientMessages, text, userId);
    return res.json({ response, messages: cleanHistory, transcript, success: true });

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
  runAgenticLoop,
  VOICE_SYSTEM_PROMPT,
  AI_TOOLS,
  buildCleanHistory,
};
