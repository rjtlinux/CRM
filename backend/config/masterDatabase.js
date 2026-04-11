const { Pool } = require('pg');
require('dotenv').config();

// Master database connection for tenant registry and plan management
// This connects to crm_master database which tracks all tenants
const masterPool = new Pool({
  host: process.env.MASTER_DB_HOST || process.env.DB_HOST || 'localhost',
  port: process.env.MASTER_DB_PORT || process.env.DB_PORT || 5432,
  database: process.env.MASTER_DB_NAME || 'crm_master',
  user: process.env.MASTER_DB_USER || process.env.DB_USER,
  password: process.env.MASTER_DB_PASSWORD || process.env.DB_PASSWORD,
  max: 10, // Fewer connections needed for master DB
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

masterPool.on('connect', () => {
  console.log('✅ Master database connected successfully');
});

masterPool.on('error', (err) => {
  console.error('❌ Unexpected master database error:', err);
  // Don't exit process - allow app to continue if master DB fails
  // Plan enforcement will gracefully degrade
});

module.exports = masterPool;
