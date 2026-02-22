const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Registry path: use env or resolve from project root (backend/routes -> ../../tenants)
const getRegistryPath = () => {
  if (process.env.TENANTS_REGISTRY_PATH) {
    return process.env.TENANTS_REGISTRY_PATH;
  }
  return path.join(__dirname, '../../tenants/registry.json');
};

// GET /api/admin/tenants - List all provisioned tenants (admin only)
router.get('/tenants', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const registryPath = getRegistryPath();
    if (!fs.existsSync(registryPath)) {
      return res.json({ tenants: [] });
    }
    const raw = fs.readFileSync(registryPath, 'utf8');
    const data = JSON.parse(raw);
    res.json({ tenants: data.tenants || [] });
  } catch (err) {
    console.error('Error reading tenant registry:', err);
    res.status(500).json({ error: 'Failed to load tenants' });
  }
});

module.exports = router;
