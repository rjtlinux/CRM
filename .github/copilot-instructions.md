# Buzeye CRM - GitHub Copilot Agent Configuration

## Product Overview

**Buzeye** is a multi-tenant CRM system designed for Indian small businesses (SMBs), traders, distributors, and service businesses. The system emphasizes simplicity, Hindi/Hinglish language support, mobile usability, and reliable action execution.

### Core Value Propositions
- Customer relationship management optimized for Indian market
- Sales tracking with Udhar Khata (credit/outstanding ledger)
- Proposal and opportunity management
- AI assistant with Hindi/Hinglish awareness and voice input
- WhatsApp AI integration for customer engagement
- GST compliance and invoicing

### Target Users
- Small Indian businesses (traders, distributors, service providers)
- Shop owners who need hands-free operation
- Businesses requiring Hindi/Hinglish language support
- Companies needing multi-tenant isolation for client deployments

---

## Technology Stack

### Frontend
- **Framework**: React 18 with functional components and hooks
- **Build Tool**: Vite (fast HMR, optimized builds)
- **Routing**: React Router v6 with protected routes
- **Styling**: TailwindCSS (utility-first CSS)
- **State Management**: React Context API
- **HTTP Client**: Axios with interceptors for auth
- **Charts**: Recharts (responsive data visualization)
- **Internationalization**: Custom i18n for Hindi/Hinglish support

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL 14+ with connection pooling
- **Authentication**: JWT tokens with bcryptjs password hashing
- **Validation**: express-validator for input sanitization
- **AI Integration**: OpenAI API (GPT-4, Whisper for voice)
- **WhatsApp**: Meta Cloud API webhook flow
- **Rate Limiting**: express-rate-limit and node-cache
- **File Upload**: multer

### Infrastructure
- **Containerization**: Docker Compose with tenant-specific stacks
- **Reverse Proxy**: Nginx for domain routing
- **Database**: PostgreSQL containers with isolated volumes per tenant
- **Deployment**: Multi-tenant with subdomain routing

---

## Architecture Patterns

### Multi-Tenant Model

**Domain Structure:**
- Root/Admin: `buzeye.com`, `admin.buzeye.com`
- Marketing: `buzeye.com` (port 3000)
- Admin CRM: `admin.buzeye.com` (ports 5173 frontend, 5000 backend)
- Tenant Pattern: `{slug}.buzeye.com` (e.g., `acme.buzeye.com`)
- Tenant Registry: `tenants/registry.json`

**Tenant Provisioning:**
- Script: `scripts/provision-tenant.sh`
- Each tenant gets: isolated DB, dedicated containers, unique ports
- Port allocation: Frontend (5180+), Backend (5010+), DB (5433+)
- Tenant directory: `/home/ubuntu/CRM/tenants/<slug>/`

**Database Isolation:**
- Each tenant has separate PostgreSQL database
- Naming convention: `crm_{slug}`
- User convention: `crm_{slug}`
- Migrations applied during provisioning via docker-entrypoint-initdb.d

### API Routing Pattern

All API routes follow RESTful conventions under `/api/` prefix:

```
/api/auth          - Authentication (login, register, token refresh)
/api/customers     - Customer CRUD operations
/api/sales         - Sales tracking and history
/api/costs         - Expense/cost management
/api/proposals     - Proposal creation and management
/api/dashboard     - Analytics and metrics
/api/opportunities - Opportunity management
/api/leads         - Lead tracking
/api/followups     - Follow-up scheduling
/api/reminders     - Reminder system
/api/udhar-khata   - Credit ledger (Udhar Khata)
/api/gst           - GST compliance and invoicing
/api/admin         - Admin panel operations
/api/ai            - AI assistant endpoints
/api/whatsapp      - WhatsApp webhook integration
```

### Database Schema Patterns

**Core Tables:**
- `users` - User authentication and roles
- `customers` - Customer master data with sector, GST info
- `sales` - Sales transactions (separate from credit)
- `costs` - Business expenses
- `proposals` + `proposal_items` - Proposal management
- `opportunities` + `opportunity_activities` - Sales pipeline
- `leads` - Lead tracking
- `followups` - Follow-up scheduling
- `reminders` - Reminder system
- `udhar_khata_entries` - Credit ledger transactions
- `whatsapp_conversations` - WhatsApp chat history
- `whatsapp_config` - WhatsApp API configuration

**Important Views:**
- `udhar_khata_summary` - Aggregated credit balances
- Various GST-related views for compliance

**Critical Relationships:**
- All customer-related tables use `customer_id` FK with CASCADE delete
- All user actions tracked via `created_by` FK to users table
- Udhar (credit) entries are SEPARATE from cash sales

---

## Code Organization

### Backend Structure
```
backend/
├── config/
│   └── database.js          # PostgreSQL connection pool
├── controllers/
│   ├── authController.js    # Login, registration, JWT
│   ├── customerController.js # Customer CRUD
│   ├── salesController.js   # Sales operations
│   ├── aiController.js      # AI assistant with Hindi/Hinglish
│   ├── whatsappController.js # WhatsApp webhook handler
│   └── udharKhataController.js # Credit ledger logic
├── middleware/
│   ├── auth.js              # JWT verification
│   └── aiRateLimit.js       # AI endpoint rate limiting
├── routes/
│   └── *Routes.js           # Express routers for each domain
├── utils/
│   └── whatsappSender.js    # Meta Graph API integration
└── server.js                # Entry point, middleware setup
```

### Frontend Structure
```
frontend/src/
├── components/
│   ├── Layout.jsx           # Main layout with sidebar
│   ├── AIChatbot.jsx        # AI assistant interface
│   ├── VoiceInput.jsx       # Voice recording component
│   ├── MobileBottomNav.jsx  # Mobile navigation
│   ├── MobileDashboard.jsx  # Mobile-optimized dashboard
│   └── LanguageSwitch.jsx   # Hindi/English toggle
├── pages/
│   ├── Dashboard.jsx        # Main analytics dashboard
│   ├── Customers.jsx        # Customer list and search
│   ├── CustomerDetail.jsx   # Individual customer view
│   ├── Sales.jsx            # Sales history
│   ├── UdharKhata.jsx       # Credit ledger interface
│   ├── GSTDashboard.jsx     # GST compliance dashboard
│   ├── Opportunities.jsx    # Sales pipeline
│   └── Admin.jsx            # Admin panel
├── services/
│   └── api.js               # Axios instance with interceptors
├── context/
│   └── AuthContext.jsx      # Global auth state
└── i18n/
    └── translations.js      # Hindi/English translations
```

### Database Scripts
```
database/
├── schema.sql               # Base schema
├── schema-tenant.sql        # Tenant-specific schema
├── enhanced_schema.sql      # Extended features
├── migrations/
│   ├── whatsapp_integration.sql
│   ├── 005_gst_compliance.sql
│   └── 006_master_tenants.sql
├── add_customer_fields_v2.sql
├── add_customer_sector.sql
├── add_opportunity_workflow.sql
├── add_gst_fields.sql
└── create_udhar_khata_views.sql
```

---

## AI Assistant Implementation

### Current Capabilities

**AI Tools (Function Calling):**
- `record_udhar` - Record credit transactions
- `record_sale` - Record cash sales
- `record_payment` - Record customer payments
- `check_balance` - Check customer outstanding balance
- `check_sales` - Sales summary queries
- `check_customers` - Customer list and metrics
- `business_summary` - Overall business analytics

**Language Processing:**
- Supports Hindi Devanagari, Hinglish, and English
- Transliteration logic in `aiController.js`
- Fuzzy customer name matching for Hindi names
- Context-aware responses

**Critical AI Behavior Rules:**
1. **NO customer creation via AI** - Removed by design decision
2. **Existing customers only** - AI searches existing customer database
3. **Fuzzy matching** - Suggests similar names if exact match not found
4. **Immediate feedback** - Never fake confirmations, actual DB writes
5. **Natural language** - Prefers concise, human-like replies in user's language

**Implementation Location:**
- Main logic: `backend/controllers/aiController.js`
- Routes: `backend/routes/aiRoutes.js`
- Rate limiting: `backend/middleware/aiRateLimit.js`
- Frontend: `frontend/src/components/AIChatbot.jsx`

---

## WhatsApp Integration

### Current State (Implemented)

**Webhook Flow:**
- `GET /api/whatsapp/webhook` - Meta verification endpoint
- `POST /api/whatsapp/webhook` - Incoming message handler
- AI response via `runAgenticLoop` (shares AI assistant logic)
- Message sending via Meta Graph API
- Conversation persistence in `whatsapp_conversations` table

**Database Tables:**
- `whatsapp_config` - API credentials, webhook token
- `whatsapp_conversations` - Chat history with timestamps

**Key Files:**
- `backend/controllers/whatsappController.js`
- `backend/routes/whatsappRoutes.js`
- `backend/utils/whatsappSender.js`
- `database/migrations/whatsapp_integration.sql`

**Operational Notes:**
- Meta requires 200 response within timeout
- Non-text messages get polite "text-only" response
- Test numbers need whitelisting in Meta console (sandbox mode)
- Mark-as-read support implemented

**Pending Features:**
- Admin panel for WhatsApp setup/status/conversations (Phase 6)
- Auto-provisioning updates in tenant script (Phase 7)

---

## Development Workflow (MANDATORY)

### Local-First Development

**Always follow this sequence:**
1. Make changes locally in development environment
2. Test thoroughly locally
3. Commit to git with descriptive messages
4. Push to origin main
5. SSH to production server
6. Pull latest changes
7. Rebuild/restart affected services
8. Validate with logs and endpoint checks

### Production Environment

**Server Details:**
- Host: `ec2-15-207-54-114.ap-south-1.compute.amazonaws.com`
- SSH User: `ubuntu`
- Main repo: `/home/ubuntu/CRM`
- Tenant path: `/home/ubuntu/CRM/tenants/<slug>`

**SSH Access:**
```bash
ssh -i "<pem-path>" ubuntu@ec2-15-207-54-114.ap-south-1.compute.amazonaws.com
```

### Docker Commands

**Health Check:**
```bash
docker-compose ps
docker-compose logs --tail=100 backend
docker-compose logs --tail=100 frontend
docker-compose logs --tail=100 database
```

**Service Management:**
```bash
docker-compose up -d --build        # Rebuild and start
docker-compose restart backend      # Restart specific service
docker-compose down                 # Stop all services
```

**Database Access:**
```bash
docker exec -it crm_database psql -U crm_user -d crm_database
docker exec -i crm_database psql -U crm_user -d crm_database < schema.sql
```

---

## Coding Standards and Best Practices

### Security Requirements (NON-NEGOTIABLE)

1. **No secrets in source control** - Use `.env` files only
2. **No credential logging** - Sanitize all error messages
3. **No API keys in frontend** - Backend proxy for all external APIs
4. **HTTPS in production** - All production endpoints must use SSL
5. **Strict file permissions** - `chmod 600` for sensitive files
6. **Environment-based config** - Use `.env` for all configuration

### Backend Conventions

**Controller Pattern:**
```javascript
// Always catch errors and send proper HTTP status
const functionName = async (req, res) => {
  try {
    // Validate input with express-validator
    // Check authentication via req.user
    // Execute business logic
    // Return consistent JSON response
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error in functionName:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sanitized error message for user' 
    });
  }
};
```

**Database Queries:**
- Always use parameterized queries (prevent SQL injection)
- Use connection pool from `config/database.js`
- Handle connection errors gracefully
- Use transactions for multi-step operations

**Authentication:**
- All protected routes use `auth` middleware
- JWT stored in localStorage (frontend)
- Token sent via Authorization header: `Bearer <token>`
- User object available as `req.user` after auth middleware

### Frontend Conventions

**Component Structure:**
```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

function ComponentName() {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Fetch data on mount
    const fetchData = async () => {
      try {
        const response = await api.get('/endpoint');
        setState(response.data);
      } catch (error) {
        console.error('Error:', error);
        // Handle error appropriately
      }
    };
    fetchData();
  }, []);
  
  return (
    {/* TailwindCSS classes for styling */}
  );
}

export default ComponentName;
```

**API Calls:**
- Use `api` service instance (has auth interceptor)
- Handle loading, error, and success states
- Show user-friendly error messages in Hindi/English

**Styling:**
- Use TailwindCSS utility classes exclusively
- Responsive: mobile-first approach
- Colors: Primary blues, secondary gold (Buzeye brand)
- Dark mode not currently implemented

### Database Conventions

**Naming:**
- Tables: lowercase, plural (e.g., `customers`, `sales`)
- Columns: snake_case (e.g., `customer_id`, `created_at`)
- Foreign keys: `{table}_id` (e.g., `customer_id`)

**Timestamps:**
- Always include `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- Include `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` where applicable
- Use triggers for auto-updating `updated_at`

**Indexes:**
- Create indexes on foreign keys
- Create indexes on frequently queried columns (email, date fields, status)
- Use composite indexes for multi-column queries

---

## Critical Business Logic

### Udhar Khata (Credit Ledger) Rules

**Strict Separation:**
- Credit entries go to `udhar_khata_entries` table
- Cash sales go to `sales` table
- NEVER mix these two in queries or UI

**Outstanding Calculation:**
```
Outstanding = Total Credit - Total Payments
Debit (credit given) increases outstanding
Credit (payment received) decreases outstanding
```

**UI Presentation:**
- Show outstanding balance prominently
- Separate views for credit history vs cash sales

### Customer Matching Logic

**AI Customer Search:**
1. Exact name match (case-insensitive)
2. Fuzzy match with Hindi transliteration
3. Partial name match
4. If multiple matches, prompt user to choose
5. If no match, inform user immediately (do NOT create)

**Transliteration:**
- Hindi Devanagari to Latin conversion
- Handles common Hindi name patterns
- Code in `aiController.js`

### GST Compliance

**GST Fields:**
- Customer GST number validation
- GST invoice generation
- HSSG code support
- GST reports and returns
- B2B vs B2C transaction handling

**Invoice Requirements:**
- Unique invoice number
- Customer GST details (if applicable)
- Item-wise HSN codes
- Tax calculation (CGST, SGST, IGST)
- Total amount with tax breakdown

---

## Testing and Validation

### High-Risk Areas (Test After ANY Change)

1. **Authentication Flow**
   - Login with valid credentials
   - Token refresh mechanism
   - Protected route access

2. **Customer Operations**
   - Customer detail page load
   - Customer field mapping (API to UI)
   - Customer search functionality

3. **Udhar Khata Integrity**
   - Outstanding balance calculations
   - Debit/credit entry separation
   - Sales list exclusion of credit entries

4. **AI Assistant**
   - Hindi/Hinglish understanding
   - Actual database writes (not fake confirmations)
   - Customer name fuzzy matching
   - Tool execution (record_sale, record_udhar, etc.)

5. **WhatsApp Integration**
   - Webhook receives messages
   - AI responses sent successfully
   - Conversation persistence

6. **Mobile Dashboard**
   - Field mappings stay consistent
   - Responsive layout works
   - Touch interactions function properly

### Debug Playbook

**Database Checks:**
```sql
-- Verify table exists
SELECT to_regclass('public.table_name');

-- Check recent WhatsApp activity
SELECT wa_phone, last_message_at 
FROM whatsapp_conversations 
ORDER BY last_message_at DESC LIMIT 10;

-- Verify customer count
SELECT COUNT(*) FROM customers WHERE status = 'active';

-- Check user roles
SELECT email, role FROM users;
```

**Common Failure Patterns:**
- Missing DB table after deploy → Run migration on tenant DB
- AI says action done but no DB write → Check tool call path and auth user
- Customer not found (false negative) → Inspect transliteration/fuzzy logic
- Udhar balance incorrect → Check view query and entry types

---

## Important File Paths (Quick Reference)

### Documentation
- `README.md` - General overview and setup
- `ARCHITECTURE.md` - Technical architecture details
- `PRODUCTION_SETUP.md` - Server deployment guide
- `DOCKER_GUIDE.md` - Docker usage instructions
- `DEPLOYMENT_ROUTING.md` - Multi-tenant routing setup
- `AI_IMPLEMENTATION_GUIDE.md` - AI features implementation
- `INDIAN_MARKET_RESEARCH.md` - Market research and user personas
- `INDIAN_MARKET_ROADMAP.md` - Product roadmap for Indian market
- `SUBSCRIPTION_SECURITY_GUIDE.md` - Subscription and security
- `agent.md` - AI agent operational handbook (this source)

### Configuration Files
- `docker-compose.yml` - Main admin stack
- `docker-compose.admin.yml` - Admin CRM stack
- `docker-compose.marketing.yml` - Marketing site stack
- `docker-compose.full.yml` - Full deployment
- `tenants/registry.json` - Tenant registry

### Scripts
- `scripts/provision-tenant.sh` - New tenant provisioning
- `scripts/rebuild-tenant-frontends.sh` - Rebuild tenant frontends
- `scripts/list-tenants.sh` - List all provisioned tenants
- `QUICK_START.sh` - Quick local setup

### AI/WhatsApp
- `backend/controllers/aiController.js` - AI assistant logic
- `backend/controllers/whatsappController.js` - WhatsApp webhook
- `backend/routes/aiRoutes.js` - AI endpoints
- `backend/routes/whatsappRoutes.js` - WhatsApp endpoints
- `backend/utils/whatsappSender.js` - Meta API integration
- `database/migrations/whatsapp_integration.sql` - WhatsApp schema

---

## Agent Operating Rules

### Before Making Changes

1. **Read relevant documentation** - Check this config and related docs
2. **Inspect related files** - Controllers, routes, migrations
3. **Verify existing behavior** - Check logs or test endpoints
4. **Understand multi-tenant impact** - Will this affect all tenants?

### During Development

1. **Follow local-first workflow** - Always test locally before production
2. **Use consistent patterns** - Match existing code style
3. **Add proper error handling** - Never let errors crash the app
4. **Log appropriately** - Helpful logs without exposing secrets
5. **Test on mobile** - Mobile users are primary audience

### After Making Changes

1. **Run targeted verification** - Test the specific feature changed
2. **Check for errors** - Use `get_errors` tool to verify
3. **Review logs** - Check docker logs for issues
4. **Do not claim fix without proof** - Verify the fix actually works
5. **Never revert unrelated changes** - Respect existing user code

### For Production Incidents

1. **Prefer minimal-risk fixes** - Target the specific issue
2. **Avoid broad refactors** - Don't introduce new risks
3. **Test in safe environment first** - If possible, test locally
4. **Document the fix** - Update relevant docs if needed
5. **Monitor after deployment** - Check logs post-deployment

---

## Known Product Decisions and Constraints

### Feature Decisions

1. **No AI customer creation** - Intentionally removed, AI works with existing customers only
2. **Existing customer suggestions** - AI offers fuzzy matches instead of creating new
3. **Hindi Devanagari support** - Transliteration and recognition implemented
4. **Mobile-first** - Mobile dashboard is priority, desktop is secondary
5. **Udhar vs Sales separation** - Strict separation maintained for accounting clarity

### Technical Constraints

1. **Multi-tenant isolation** - Each tenant must have isolated DB and containers
2. **Port allocation** - Sequential port assignment for tenants
3. **Nginx routing** - Subdomain-based routing via Nginx config
4. **WhatsApp limitations** - Test mode requires whitelisted numbers
5. **AI rate limiting** - Implemented to prevent abuse/cost overruns

---

## Pending Roadmap Items

### WhatsApp Integration
- **Phase 6**: Admin panel for WhatsApp setup, status, conversation history
- **Phase 7**: Auto-provisioning integration in `provision-tenant.sh`

### AI Enhancements
- Enhanced voice recognition for shop floor environments
- Multi-language voice output (Hindi TTS)
- Smarter product catalog integration

### Mobile App
- Native mobile app for Android/iOS
- Offline-first capabilities
- Push notifications for reminders

---

## Common Tasks and How to Approach Them

### Adding a New API Endpoint

1. Create controller function in `backend/controllers/`
2. Add route in `backend/routes/`
3. Register route in `backend/server.js`
4. Add API call in `frontend/src/services/api.js` (if needed)
5. Test with curl or Postman
6. Implement frontend UI component

### Adding a Database Column

1. Write migration SQL in `database/` or `database/migrations/`
2. Test migration on local database
3. Update affected controllers to handle new column
4. Update frontend to display/edit new field
5. For tenants: Add migration to provisioning script

### Debugging AI Assistant Issues

1. Check `backend/controllers/aiController.js` for tool definitions
2. Verify OpenAI API key in `.env`
3. Check rate limiting in `backend/middleware/aiRateLimit.js`
4. Review conversation context passing
5. Test with simple queries first, then complex ones
6. Check logs for OpenAI API errors

### Debugging WhatsApp Webhook

1. Verify webhook URL in Meta console
2. Check webhook token matches `.env` value
3. Review logs in `docker-compose logs backend`
4. Test verification endpoint: `GET /api/whatsapp/webhook?hub.verify_token=...`
5. Check database for conversation records
6. Verify Graph API credentials for sending messages

---

## Additional Context for Agents

### Language and Localization
- **Primary languages**: Hindi (Devanagari), Hinglish (mixed), English
- **Translation file**: `frontend/src/i18n/translations.js`
- **UI elements**: Should support language toggle
- **AI responses**: Must match user's input language

### Error Handling Philosophy
- **User-facing errors**: Always friendly, never technical
- **Log errors verbosely**: For debugging, but sanitize sensitive data
- **Provide actionable feedback**: Tell user what to do next
- **Hindi error messages**: For Hindi-speaking users

### Performance Considerations
- **Database queries**: Use indexes, avoid N+1 queries
- **API responses**: Keep payload size minimal
- **Frontend rendering**: Lazy load large lists
- **Mobile data**: Minimize data transfer for mobile users

### Indian Market Specifics
- **Currency**: INR (₹), no decimals in UI for rupees
- **Phone numbers**: Support +91 country code, 10-digit format
- **Business hours**: Align with Indian business day (10 AM - 8 PM IST)
- **Holidays**: Consider Indian holidays for reminders/notifications

---

## When in Doubt

1. **Read agent.md** - The operational handbook has battle-tested knowledge
2. **Check existing patterns** - Look at similar features already implemented
3. **Ask for clarification** - Better to confirm than assume
4. **Start small** - Make incremental changes, test frequently
5. **Follow the workflow** - Local test → Commit → Push → Pull → Deploy → Verify

---

*This configuration should guide all AI-assisted development on Buzeye CRM. Update this file when major architectural changes occur.*
