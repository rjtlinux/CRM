const pool = require('../config/database');

const getAllProposals = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.company_name as customer_name
      FROM proposals p
      LEFT JOIN customers c ON p.customer_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json({ proposals: result.rows });
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getProposalById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get proposal details
    const proposalResult = await pool.query(`
      SELECT p.*, c.company_name as customer_name, c.contact_person, c.email
      FROM proposals p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.id = $1
    `, [id]);
    
    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    // Get proposal items
    const itemsResult = await pool.query(
      'SELECT * FROM proposal_items WHERE proposal_id = $1',
      [id]
    );
    
    const proposal = {
      ...proposalResult.rows[0],
      items: itemsResult.rows
    };
    
    res.json({ proposal });
  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createProposal = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { customer_id, proposal_number, title, description, total_amount, status, valid_until, items } = req.body;
    
    // Create proposal
    const proposalResult = await client.query(
      `INSERT INTO proposals (customer_id, proposal_number, title, description, total_amount, status, valid_until, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [customer_id, proposal_number, title, description, total_amount, status, valid_until, req.user.id]
    );
    
    const proposal = proposalResult.rows[0];
    
    // Create proposal items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO proposal_items (proposal_id, item_name, description, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [proposal.id, item.item_name, item.description, item.quantity, item.unit_price, item.total_price]
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({ 
      message: 'Proposal created successfully',
      proposal 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create proposal error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

const updateProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, proposal_number, title, description, total_amount, status, valid_until } = req.body;
    
    const result = await pool.query(
      `UPDATE proposals 
       SET customer_id = $1, proposal_number = $2, title = $3, description = $4, 
           total_amount = $5, status = $6, valid_until = $7
       WHERE id = $8
       RETURNING *`,
      [customer_id, proposal_number, title, description, total_amount, status, valid_until, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    res.json({ 
      message: 'Proposal updated successfully',
      proposal: result.rows[0] 
    });
  } catch (error) {
    console.error('Update proposal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteProposal = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM proposals WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    res.json({ message: 'Proposal deleted successfully' });
  } catch (error) {
    console.error('Delete proposal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllProposals,
  getProposalById,
  createProposal,
  updateProposal,
  deleteProposal
};
