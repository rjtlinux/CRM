const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - Required for rate limiting behind Nginx
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration - Allow all buzeye.com subdomains
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Allow all buzeye.com subdomains and localhost
    if (
      origin.endsWith('.buzeye.com') || 
      origin === 'https://buzeye.com' ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:3000' ||
      origin.includes('localhost')
    ) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limit to all API routes
app.use('/api/', generalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const salesRoutes = require('./routes/salesRoutes');
const costRoutes = require('./routes/costRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const leadRoutes = require('./routes/leadRoutes');
const followupRoutes = require('./routes/followupRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const opportunityActivityRoutes = require('./routes/opportunityActivityRoutes');
const udharKhataRoutes = require('./routes/udharKhataRoutes');
const gstRoutes = require('./routes/gstRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const planRoutes = require('./routes/planRoutes');

// API Routes
app.use('/api/auth', authLimiter, authRoutes); // Rate limit auth endpoints
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/opportunity-activities', opportunityActivityRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/udhar-khata', udharKhataRoutes);
app.use('/api/gst', gstRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/plan', planRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'CRM API is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Enterprise CRM API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      customers: '/api/customers',
      sales: '/api/sales',
      costs: '/api/costs',
      proposals: '/api/proposals',
      dashboard: '/api/dashboard'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler - never expose stack traces or env vars in production
app.use((err, req, res, next) => {
  console.error('Global error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize WhatsApp reminder scheduler
// Run every 5 minutes to check for pending reminders
const { processWhatsAppReminders } = require('./services/whatsappReminderScheduler');

cron.schedule('*/5 * * * *', () => {
  console.log('[Cron] Running WhatsApp reminder check...');
  processWhatsAppReminders().catch(err => {
    console.error('[Cron] Error in WhatsApp reminder scheduler:', err);
  });
});

console.log('[Scheduler] WhatsApp reminder cron job initialized (runs every 5 minutes)');

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('  🚀 CRM Backend Server Started');
  console.log('========================================');
  console.log(`  Server running on port: ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  API Base URL: http://localhost:${PORT}/api`);
  console.log('========================================');
});

module.exports = app;
