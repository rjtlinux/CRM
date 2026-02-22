const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserRole
} = require('../controllers/authController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Public routes (registration disabled - admin-only onboarding)
router.post('/register', (req, res) => {
  res.status(403).json({ error: 'Registration disabled. Contact admin for access.' });
});
router.post('/login', login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

// Admin-only routes for user management
router.get('/users', authenticateToken, getAllUsers);
router.get('/users/:id', authenticateToken, getUserById);
router.put('/users/:id', authenticateToken, updateUser);
router.delete('/users/:id', authenticateToken, deleteUser);
router.put('/users/:id/role', authenticateToken, updateUserRole);

module.exports = router;
