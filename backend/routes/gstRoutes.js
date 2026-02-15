const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all GST rates
router.get('/rates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM gst_rates WHERE is_active = true ORDER BY rate'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching GST rates:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search HSN/SAC codes
router.get('/hsn-sac/search', authenticateToken, async (req, res) => {
  try {
    const { query, type } = req.query;
    
    let sql = 'SELECT * FROM hsn_sac_codes WHERE is_active = true';
    const params = [];
    
    if (query) {
      sql += ' AND (code ILIKE $1 OR description ILIKE $1)';
      params.push(`%${query}%`);
    }
    
    if (type) {
      sql += params.length > 0 ? ' AND type = $2' : ' AND type = $1';
      params.push(type);
    }
    
    sql += ' ORDER BY code LIMIT 50';
    
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching HSN/SAC codes:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get HSN/SAC code by code
router.get('/hsn-sac/:code', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM hsn_sac_codes WHERE code = $1',
      [req.params.code]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'HSN/SAC code not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching HSN/SAC code:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create HSN/SAC code
router.post('/hsn-sac', authenticateToken, async (req, res) => {
  try {
    const { code, description, type, gst_rate, category } = req.body;
    
    const result = await pool.query(
      `INSERT INTO hsn_sac_codes (code, description, type, gst_rate, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, description, type, gst_rate, category]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating HSN/SAC code:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'HSN/SAC code already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate GST invoice
router.post('/invoices', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      customer_id,
      invoice_type,
      place_of_supply,
      items,
      notes
    } = req.body;
    
    // Get customer details
    const customerResult = await client.query(
      'SELECT * FROM customers WHERE id = $1',
      [customer_id]
    );
    
    if (customerResult.rows.length === 0) {
      throw new Error('Customer not found');
    }
    
    const customer = customerResult.rows[0];
    
    // Get company details
    const companyResult = await client.query(
      'SELECT * FROM company_settings ORDER BY id LIMIT 1'
    );
    
    if (companyResult.rows.length === 0) {
      throw new Error('Company settings not configured');
    }
    
    const company = companyResult.rows[0];
    
    // Generate invoice number
    const invoiceNumberResult = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_number
       FROM gst_invoices
       WHERE invoice_number LIKE 'INV-%'`
    );
    const invoiceNumber = `INV-${String(invoiceNumberResult.rows[0].next_number).padStart(6, '0')}`;
    
    // Determine if interstate
    const isInterstate = customer.gst_state !== company.state;
    
    // Calculate totals
    let taxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    
    items.forEach(item => {
      const itemTaxable = item.quantity * item.rate;
      const gstAmount = itemTaxable * (item.gst_rate / 100);
      
      taxableAmount += itemTaxable;
      
      if (isInterstate) {
        totalIgst += gstAmount;
      } else {
        totalCgst += gstAmount / 2;
        totalSgst += gstAmount / 2;
      }
    });
    
    const totalGst = totalCgst + totalSgst + totalIgst;
    const totalAmount = taxableAmount + totalGst;
    
    // Insert invoice
    const invoiceResult = await client.query(
      `INSERT INTO gst_invoices (
        invoice_number, invoice_date, customer_id, customer_gstin, customer_name,
        customer_address, customer_state, company_gstin, company_name, company_address,
        company_state, invoice_type, place_of_supply, taxable_amount, cgst_amount,
        sgst_amount, igst_amount, total_gst, total_amount, notes, created_by
      ) VALUES (
        $1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      ) RETURNING *`,
      [
        invoiceNumber, customer_id, customer.gstin, customer.company_name,
        customer.address, customer.gst_state, company.gstin, company.company_name,
        company.address, company.state, invoice_type, place_of_supply,
        taxableAmount, totalCgst, totalSgst, totalIgst, totalGst, totalAmount,
        notes, req.user.userId
      ]
    );
    
    const invoice = invoiceResult.rows[0];
    
    // Insert invoice items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemTaxable = item.quantity * item.rate;
      const gstAmount = itemTaxable * (item.gst_rate / 100);
      
      await client.query(
        `INSERT INTO gst_invoice_items (
          invoice_id, item_number, description, hsn_code, quantity, unit, rate,
          taxable_amount, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          invoice.id,
          i + 1,
          item.description,
          item.hsn_code,
          item.quantity,
          item.unit || 'NOS',
          item.rate,
          itemTaxable,
          item.gst_rate,
          isInterstate ? 0 : gstAmount / 2,
          isInterstate ? 0 : gstAmount / 2,
          isInterstate ? gstAmount : 0,
          itemTaxable + gstAmount
        ]
      );
    }
    
    await client.query('COMMIT');
    
    // Fetch complete invoice with items
    const completeInvoice = await client.query(
      `SELECT i.*, 
        json_agg(
          json_build_object(
            'id', it.id,
            'item_number', it.item_number,
            'description', it.description,
            'hsn_code', it.hsn_code,
            'quantity', it.quantity,
            'unit', it.unit,
            'rate', it.rate,
            'taxable_amount', it.taxable_amount,
            'gst_rate', it.gst_rate,
            'cgst_amount', it.cgst_amount,
            'sgst_amount', it.sgst_amount,
            'igst_amount', it.igst_amount,
            'total_amount', it.total_amount
          ) ORDER BY it.item_number
        ) as items
      FROM gst_invoices i
      LEFT JOIN gst_invoice_items it ON i.id = it.invoice_id
      WHERE i.id = $1
      GROUP BY i.id`,
      [invoice.id]
    );
    
    res.status(201).json(completeInvoice.rows[0]);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating GST invoice:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  } finally {
    client.release();
  }
});

// Get GST invoices
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, customer_id, invoice_type } = req.query;
    
    let sql = `
      SELECT i.*, c.company_name as customer_name
      FROM gst_invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (start_date) {
      sql += ` AND i.invoice_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      sql += ` AND i.invoice_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    if (customer_id) {
      sql += ` AND i.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }
    
    if (invoice_type) {
      sql += ` AND i.invoice_type = $${paramCount}`;
      params.push(invoice_type);
      paramCount++;
    }
    
    sql += ' ORDER BY i.invoice_date DESC, i.invoice_number DESC LIMIT 100';
    
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching GST invoices:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single GST invoice with items
router.get('/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, 
        json_agg(
          json_build_object(
            'id', it.id,
            'item_number', it.item_number,
            'description', it.description,
            'hsn_code', it.hsn_code,
            'quantity', it.quantity,
            'unit', it.unit,
            'rate', it.rate,
            'taxable_amount', it.taxable_amount,
            'gst_rate', it.gst_rate,
            'cgst_amount', it.cgst_amount,
            'sgst_amount', it.sgst_amount,
            'igst_amount', it.igst_amount,
            'total_amount', it.total_amount
          ) ORDER BY it.item_number
        ) as items
      FROM gst_invoices i
      LEFT JOIN gst_invoice_items it ON i.id = it.invoice_id
      WHERE i.id = $1
      GROUP BY i.id`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching GST invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get GST summary for a period
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const result = await pool.query(
      `SELECT 
        invoice_type,
        COUNT(*) as invoice_count,
        SUM(taxable_amount) as total_taxable,
        SUM(cgst_amount) as total_cgst,
        SUM(sgst_amount) as total_sgst,
        SUM(igst_amount) as total_igst,
        SUM(total_gst) as total_gst,
        SUM(total_amount) as total_amount
      FROM gst_invoices
      WHERE invoice_date BETWEEN $1 AND $2
      GROUP BY invoice_type
      ORDER BY invoice_type`,
      [start_date || '1900-01-01', end_date || '2100-12-31']
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching GST summary:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate GSTR-1 report data
router.get('/reports/gstr1', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    // B2B invoices
    const b2bResult = await pool.query(
      `SELECT 
        customer_gstin,
        customer_name,
        invoice_number,
        invoice_date,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_gst,
        total_amount,
        place_of_supply
      FROM gst_invoices
      WHERE invoice_type = 'B2B'
        AND invoice_date BETWEEN $1 AND $2
        AND customer_gstin IS NOT NULL
      ORDER BY invoice_date, invoice_number`,
      [startDate, endDate]
    );
    
    // B2C Large (> 2.5 lakhs)
    const b2cLargeResult = await pool.query(
      `SELECT 
        place_of_supply,
        SUM(taxable_amount) as taxable_amount,
        SUM(cgst_amount) as cgst_amount,
        SUM(sgst_amount) as sgst_amount,
        SUM(igst_amount) as igst_amount,
        SUM(total_gst) as total_gst,
        SUM(total_amount) as total_amount,
        COUNT(*) as invoice_count
      FROM gst_invoices
      WHERE invoice_type = 'B2C'
        AND invoice_date BETWEEN $1 AND $2
        AND total_amount > 250000
      GROUP BY place_of_supply
      ORDER BY place_of_supply`,
      [startDate, endDate]
    );
    
    // B2C Small summary
    const b2cSmallResult = await pool.query(
      `SELECT 
        gst_rate,
        SUM(taxable_amount) as taxable_amount,
        SUM(total_gst) as total_gst,
        COUNT(*) as invoice_count
      FROM gst_invoices i
      WHERE invoice_type = 'B2C'
        AND invoice_date BETWEEN $1 AND $2
        AND total_amount <= 250000
      GROUP BY gst_rate
      ORDER BY gst_rate`,
      [startDate, endDate]
    );
    
    res.json({
      period: { month, year, start_date: startDate, end_date: endDate },
      b2b: b2bResult.rows,
      b2c_large: b2cLargeResult.rows,
      b2c_small: b2cSmallResult.rows
    });
    
  } catch (error) {
    console.error('Error generating GSTR-1 report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate GSTR-3B report data
router.get('/reports/gstr3b', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    // Outward taxable supplies
    const outwardSuppliesResult = await pool.query(
      `SELECT 
        SUM(taxable_amount) as total_taxable,
        SUM(cgst_amount) as total_cgst,
        SUM(sgst_amount) as total_sgst,
        SUM(igst_amount) as total_igst,
        SUM(total_gst) as total_gst
      FROM gst_invoices
      WHERE invoice_date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    
    // Rate-wise summary
    const rateWiseResult = await pool.query(
      `SELECT 
        CASE 
          WHEN cgst_amount > 0 THEN (cgst_amount + sgst_amount) / taxable_amount * 100
          WHEN igst_amount > 0 THEN igst_amount / taxable_amount * 100
          ELSE 0
        END as gst_rate,
        SUM(taxable_amount) as taxable_value,
        SUM(cgst_amount) as cgst,
        SUM(sgst_amount) as sgst,
        SUM(igst_amount) as igst
      FROM gst_invoices
      WHERE invoice_date BETWEEN $1 AND $2
        AND taxable_amount > 0
      GROUP BY 
        CASE 
          WHEN cgst_amount > 0 THEN (cgst_amount + sgst_amount) / taxable_amount * 100
          WHEN igst_amount > 0 THEN igst_amount / taxable_amount * 100
          ELSE 0
        END
      ORDER BY gst_rate`,
      [startDate, endDate]
    );
    
    res.json({
      period: { month, year, start_date: startDate, end_date: endDate },
      outward_supplies: outwardSuppliesResult.rows[0],
      rate_wise_summary: rateWiseResult.rows
    });
    
  } catch (error) {
    console.error('Error generating GSTR-3B report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get/Update company settings
router.get('/company-settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM company_settings ORDER BY id LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company settings not configured' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/company-settings/:id', authenticateToken, async (req, res) => {
  try {
    const {
      company_name, gstin, pan, address, city, state, pincode,
      phone, email, website, bank_name, bank_account, bank_ifsc, bank_branch
    } = req.body;
    
    const result = await pool.query(
      `UPDATE company_settings SET
        company_name = $1, gstin = $2, pan = $3, address = $4, city = $5,
        state = $6, pincode = $7, phone = $8, email = $9, website = $10,
        bank_name = $11, bank_account = $12, bank_ifsc = $13, bank_branch = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *`,
      [
        company_name, gstin, pan, address, city, state, pincode,
        phone, email, website, bank_name, bank_account, bank_ifsc, bank_branch,
        req.params.id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company settings not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating company settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
