const pool = require('../config/database');

// Get all activities for an opportunity
const getActivities = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    
    const result = await pool.query(
      `SELECT oa.*, u.full_name as user_name, u.email as user_email
       FROM opportunity_activities oa
       LEFT JOIN users u ON oa.user_id = u.id
       WHERE oa.opportunity_id = $1
       ORDER BY oa.created_at DESC`,
      [opportunityId]
    );
    
    res.json({ activities: result.rows });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add activity
const addActivity = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const { activity_type, description, previous_value, new_value } = req.body;
    
    const result = await pool.query(
      `INSERT INTO opportunity_activities 
       (opportunity_id, user_id, activity_type, description, previous_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [opportunityId, req.user.id, activity_type, description, previous_value, new_value]
    );
    
    res.status(201).json({ 
      message: 'Activity added successfully',
      activity: result.rows[0] 
    });
  } catch (error) {
    console.error('Add activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all comments for an opportunity
const getComments = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    
    const result = await pool.query(
      `SELECT oc.*, u.full_name as user_name, u.email as user_email
       FROM opportunity_comments oc
       LEFT JOIN users u ON oc.user_id = u.id
       WHERE oc.opportunity_id = $1
       ORDER BY oc.created_at DESC`,
      [opportunityId]
    );
    
    res.json({ comments: result.rows });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add comment
const addComment = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const { comment, is_internal } = req.body;
    
    const result = await pool.query(
      `INSERT INTO opportunity_comments 
       (opportunity_id, user_id, comment, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [opportunityId, req.user.id, comment, is_internal || false]
    );
    
    // Also add to activity log
    await pool.query(
      `INSERT INTO opportunity_activities 
       (opportunity_id, user_id, activity_type, description)
       VALUES ($1, $2, 'comment', $3)`,
      [opportunityId, req.user.id, 'Added a comment']
    );
    
    res.status(201).json({ 
      message: 'Comment added successfully',
      comment: result.rows[0] 
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update comment
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { comment } = req.body;
    
    const result = await pool.query(
      `UPDATE opportunity_comments 
       SET comment = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [comment, commentId, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }
    
    res.json({ 
      message: 'Comment updated successfully',
      comment: result.rows[0] 
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM opportunity_comments WHERE id = $1 AND user_id = $2 RETURNING *',
      [commentId, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getActivities,
  addActivity,
  getComments,
  addComment,
  updateComment,
  deleteComment
};
