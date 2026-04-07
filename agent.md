# Buzeye Agent Handbook

This file is the operational memory for future AI/code agents working on Buzeye.
It captures product context, architecture, workflows, production details, and do/don't rules.

## 1) Product Snapshot

- Product: `Buzeye` (multi-tenant CRM for Indian SMBs).
- Core users: small Indian businesses (traders, distributors, service businesses).
- Core value:
  - Customer management
  - Sales tracking
  - Udhar Khata (credit/outstanding ledger)
  - Proposal management
  - AI assistant (Hindi/Hinglish aware)
  - WhatsApp AI integration
- Business priority: simple UX, Hindi/Hinglish friendliness, mobile usability, reliable action execution.

## 2) Current Tech Stack

- Frontend: React 18 + Vite + TailwindCSS.
- Backend: Node.js + Express.
- DB: PostgreSQL.
- Infra: Docker Compose (tenant-specific stacks) + Nginx routing.
- Auth: JWT.
- AI: OpenAI API (chat + Whisper).
- WhatsApp: Meta Cloud API webhook flow.

## 3) Important Repository Paths

- Frontend app: `frontend/src`
- Backend app: `backend`
- DB schema/migrations: `database`
- Tenant provisioning script: `scripts/provision-tenant.sh`
- WhatsApp migration: `database/migrations/whatsapp_integration.sql`

AI/WhatsApp key backend files:
- `backend/controllers/aiController.js`
- `backend/controllers/whatsappController.js`
- `backend/routes/aiRoutes.js`
- `backend/routes/whatsappRoutes.js`
- `backend/utils/whatsappSender.js`
- `backend/server.js`

## 4) Multi-Tenant / Domain Model

- Root/admin domains:
  - `buzeye.com`
  - `admin.buzeye.com`
- Tenant domain pattern:
  - `{tenantSlug}.buzeye.com` (example: `acme.buzeye.com`)
- Tenant registry file:
  - `tenants/registry.json`

## 5) Production Environment (Known)

- App server (current known host): `ec2-15-207-54-114.ap-south-1.compute.amazonaws.com`
- SSH user: `ubuntu`
- Typical SSH command format:
  - `ssh -i "<pem-path>" ubuntu@ec2-15-207-54-114.ap-south-1.compute.amazonaws.com`
- Tenant project root on server:
  - `/home/ubuntu/CRM/tenants/<tenant-slug>`
- Main repo root on server:
  - `/home/ubuntu/CRM`

Important:
- Never commit secrets to git.
- Keep API keys/tokens/passwords only in tenant `.env` on server.
- Keep strict file permissions for secrets (`chmod 600`).

## 6) Login & Access Method (Safe)

For future agents, use this method instead of storing plain credentials in docs:

1. SSH into server using PEM key.
2. Read tenant `.env` securely if needed (do not print secrets in logs).
3. Use DB checks for user existence (email/role), not password disclosure.
4. If password reset is requested, set a new bcrypt hash directly in DB and inform owner privately.

Guidelines:
- Do not hardcode or expose passwords/tokens in code, terminal output, browser console, or agent notes.
- If credentials are accidentally exposed, rotate immediately.

## 7) Local Development Workflow (Must Follow)

Preferred workflow (already requested by owner):
- Make changes locally first.
- Test locally.
- Commit and push to git.
- Pull latest on server.
- Rebuild/restart affected services.
- Verify in production.

Quick sequence:
1. Local edit + test
2. `git add ...`
3. `git commit -m "..."`
4. `git push origin main`
5. SSH server, then `git pull origin main`
6. `docker-compose up -d --build` (or restart targeted service)
7. Validate with logs + real endpoint checks

## 8) AI Assistant Behavior Expectations

The assistant must:
- Reply naturally in user's language (Hindi/Hinglish/English).
- Prefer concise human-like replies.
- Execute CRM actions via tools (not fake confirmations).
- Work with existing customers only (as per current product direction).
- If customer not found:
  - Say not found immediately.
  - Offer likely name suggestions when fuzzy matches exist.

Current known AI tool capability includes:
- record credit (`record_udhar`)
- record cash sale (`record_sale`)
- record payment (`record_payment`)
- check customer balance (`check_balance`)
- check sales summary (`check_sales`)
- check customer metrics/list (`check_customers`)
- business summary (`business_summary`)

## 9) WhatsApp Integration (Current State)

Implemented:
- Public webhook verification + inbound handler
- AI response flow reusing `runAgenticLoop`
- Conversation persistence in DB
- Reply sending via Meta Graph API
- Mark-as-read support

DB tables:
- `whatsapp_config`
- `whatsapp_conversations`

Webhook endpoint shape:
- `GET /api/whatsapp/webhook` (verification)
- `POST /api/whatsapp/webhook` (incoming messages)

Operational notes:
- Meta retries if 200 is not returned quickly.
- Non-text messages currently return a text-only support response.
- WhatsApp test numbers in sandbox mode need whitelisted recipient numbers in Meta console.

## 10) Known Feature Decisions / Constraints

- Customer creation via AI has been removed by request.
- AI should operate on existing customers and suggest matches for unclear names.
- Hindi Devanagari recognition/transliteration logic exists in `aiController.js`.
- Mobile dashboard had prior field-mapping issues; ensure API response mapping stays consistent.
- Udhar vs sales logic must remain strictly separated.

## 11) High-Risk Areas to Test After Any Change

- Login/auth token flow
- Customer detail page load
- Udhar Khata entries and outstanding calculations
- Sales list does not mix credit entries
- AI assistant:
  - understands Hindi/Hinglish
  - actually writes to DB when confirming actions
  - finds existing customers reliably (including fuzzy input)
- WhatsApp:
  - webhook receives inbound messages
  - AI replies are sent successfully
  - conversation history persists

## 12) Quick Debug Playbook

### App/Container health
- `docker-compose ps`
- `docker-compose logs --tail=100 backend`
- `docker-compose logs --tail=100 frontend`
- `docker-compose logs --tail=100 database`

### DB check examples
- Verify table exists:
  - `SELECT to_regclass('public.whatsapp_conversations');`
- Check latest WhatsApp threads:
  - `SELECT wa_phone, last_message_at FROM whatsapp_conversations ORDER BY last_message_at DESC LIMIT 10;`

### Common failure patterns
- Missing DB table after deploy -> run migration against active tenant DB.
- AI says action done but no DB write -> inspect tool call path and auth user used for writes.
- Customer not found false negatives -> inspect transliteration/fuzzy matching logic.

## 13) Security Requirements (Non-Negotiable)

- No secrets in source control.
- No plain credential logging.
- No API keys in frontend bundle.
- Sanitize error messages.
- Use HTTPS for production endpoints.
- Keep `.env` restricted and tenant-scoped.

## 14) Pending Product/Engineering Roadmap Items

Current known pending phases for WhatsApp:
- Phase 6: Admin panel WhatsApp setup/status/conversation page.
- Phase 7: Auto-provisioning updates in `provision-tenant.sh` for WhatsApp/AI env + schema consistency.

## 15) Agent Operating Rules for Future Work

- Read this file first.
- Before edits:
  - inspect related controllers/routes/migrations.
  - verify existing behavior with logs or API test.
- After edits:
  - run targeted verification.
  - check for lints/tests where feasible.
  - do not claim fix without proof.
- Never revert unrelated user changes.
- For production incidents, prefer minimal-risk targeted fixes over broad refactors.

## 16) Useful Docs In This Repo

- `README.md`
- `ARCHITECTURE.md`
- `PRODUCTION_SETUP.md`
- `DOCKER_GUIDE.md`
- `DEPLOYMENT_ROUTING.md`
- `AI_IMPLEMENTATION_GUIDE.md`
- `INDIAN_MARKET_RESEARCH.md`
- `INDIAN_MARKET_ROADMAP.md`
- `SUBSCRIPTION_SECURITY_GUIDE.md`

---

If this handbook gets stale, update it in the same PR as major architecture/deployment changes.
