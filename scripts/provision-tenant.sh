#!/bin/bash
#
# Provision a new Buzeye CRM tenant (Separate Deployment Per Tenant - Option D)
# Each client gets: own subdomain, own database, own containers
#
# Usage: ./provision-tenant.sh <slug> "Company Name" admin@company.com "Admin Name" [plan]
#
# Example: ./provision-tenant.sh acme "Acme Corp" admin@acme.com "John Doe" starter
#          Creates: https://acme.buzeye.com with isolated DB and containers
#
# Plans: starter, professional, enterprise (default: professional)
#

set -e

SLUG=$1
COMPANY_NAME=$2
ADMIN_EMAIL=$3
ADMIN_NAME=${4:-"Admin"}
PLAN=${5:-"professional"}
ADMIN_PASSWORD=${6:-"Buzeye@2026"}

if [ -z "$SLUG" ] || [ -z "$COMPANY_NAME" ] || [ -z "$ADMIN_EMAIL" ]; then
    echo "Usage: $0 <slug> \"Company Name\" admin@company.com [Admin Name] [plan] [Admin Password]"
    echo ""
    echo "Example: $0 acme \"Acme Corp\" admin@acme.com \"John Doe\" starter"
    echo ""
    echo "Slug becomes subdomain: acme.buzeye.com"
    echo "Plans: starter, professional (default), enterprise"
    exit 1
fi

# Validate slug (alphanumeric, lowercase)
SLUG=$(echo "$SLUG" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
if [ -z "$SLUG" ]; then
    echo "Error: Invalid slug. Use only letters and numbers."
    exit 1
fi

# Validate plan
PLAN=$(echo "$PLAN" | tr '[:upper:]' '[:lower:]')
if [[ ! "$PLAN" =~ ^(starter|professional|enterprise)$ ]]; then
    echo "Error: Invalid plan '$PLAN'. Use: starter, professional, or enterprise"
    exit 1
fi

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TENANTS_DIR="${BASE_DIR}/tenants"
TENANT_DIR="${TENANTS_DIR}/${SLUG}"

# Port allocation
COUNT=$(ls -d "$TENANTS_DIR"/*/ 2>/dev/null | wc -l || echo 0)
NEXT_FRONTEND=$((5180 + COUNT))
NEXT_BACKEND=$((5010 + COUNT))
NEXT_DB=$((5433 + COUNT))

# Credentials
DB_NAME="crm_${SLUG}"
DB_USER="crm_${SLUG}"
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)
JWT_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

echo "=========================================="
echo "Provisioning tenant: $SLUG"
echo "Subdomain: $SLUG.buzeye.com"
echo "Company: $COMPANY_NAME"
echo "Plan: $PLAN"
echo "=========================================="

mkdir -p "$TENANT_DIR"

# Create tenant docker-compose.yml
cat > "$TENANT_DIR/docker-compose.yml" << EOF
version: '3.8'

services:
  database:
    image: postgres:14-alpine
    container_name: crm_${SLUG}_database
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "${NEXT_DB}:5432"
    restart: unless-stopped
    volumes:
      - ${SLUG}_postgres_data:/var/lib/postgresql/data
      - ${BASE_DIR}/database/schema-tenant.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ${BASE_DIR}/database/enhanced_schema.sql:/docker-entrypoint-initdb.d/02-enhanced.sql
      - ${BASE_DIR}/database/migrations/005_gst_compliance.sql:/docker-entrypoint-initdb.d/03-gst.sql
      - ${BASE_DIR}/database/add_customer_fields_v2.sql:/docker-entrypoint-initdb.d/04-customer-fields.sql
      - ${BASE_DIR}/database/add_customer_sector.sql:/docker-entrypoint-initdb.d/05-customer-sector.sql
      - ${BASE_DIR}/database/add_opportunity_workflow.sql:/docker-entrypoint-initdb.d/06-opportunity-workflow.sql
      - ${BASE_DIR}/database/add_gst_fields.sql:/docker-entrypoint-initdb.d/07-gst-fields.sql
      - ${BASE_DIR}/database/create_udhar_khata_views.sql:/docker-entrypoint-initdb.d/08-udhar-khata.sql
    networks:
      - ${SLUG}_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ${BASE_DIR}/backend
      dockerfile: Dockerfile
    container_name: crm_${SLUG}_backend
    restart: unless-stopped
    environment:
      PORT: 5000
      NODE_ENV: production
      DB_HOST: database
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      TENANTS_REGISTRY_PATH: /app/tenants-registry/registry.json
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      MASTER_DB_HOST: crm_database
      MASTER_DB_PORT: 5432
      MASTER_DB_NAME: crm_master
      MASTER_DB_USER: crm_user
      MASTER_DB_PASSWORD: ${MASTER_DB_PASSWORD:-CRMSecure2026}
    volumes:
      - ${TENANTS_DIR}/registry.json:/app/tenants-registry/registry.json:ro
7    ports:
      - "${NEXT_BACKEND}:5000"
    depends_on:
      database:
        condition: service_healthy
    networks:
      - ${SLUG}_network
    command: node server.js

  frontend:
    build:
      context: ${BASE_DIR}/frontend
      dockerfile: Dockerfile
    container_name: crm_${SLUG}_frontend
    restart: unless-stopped
    environment:
      VITE_API_URL: /api
    ports:
      - "${NEXT_FRONTEND}:5173"
    depends_on:
      - backend
    networks:
      - ${SLUG}_network
    command: npm run dev -- --host 0.0.0.0

volumes:
  ${SLUG}_postgres_data:

networks:
  ${SLUG}_network:
    driver: bridge
EOF

# Create .env for tenant
cat > "$TENANT_DIR/.env" << EOF
SLUG=${SLUG}
COMPANY_NAME=${COMPANY_NAME}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
FRONTEND_PORT=${NEXT_FRONTEND}
BACKEND_PORT=${NEXT_BACKEND}
DB_PORT=${NEXT_DB}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF

# Create Nginx config
NGINX_CONF="$TENANT_DIR/nginx.conf"
cat > "$NGINX_CONF" << EOF
# Nginx config for ${SLUG}.buzeye.com
# Add to: /etc/nginx/sites-available/buzeye-tenants.conf
# Or: include ${TENANT_DIR}/nginx.conf;

server {
    listen 80;
    server_name ${SLUG}.buzeye.com;
    
    location / {
        proxy_pass http://127.0.0.1:${NEXT_FRONTEND};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:${NEXT_BACKEND};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Create tenants registry file (JSON, no master DB required initially)
REGISTRY="$TENANTS_DIR/registry.json"
if [ ! -f "$REGISTRY" ]; then
    echo '{"tenants":[]}' > "$REGISTRY"
fi
# Add tenant to registry (using jq if available, else append)
if command -v jq &> /dev/null; then
    jq --arg slug "$SLUG" --arg name "$COMPANY_NAME" --arg email "$ADMIN_EMAIL" --arg subdomain "${SLUG}.buzeye.com" \
       '.tenants += [{"slug":$slug,"name":$name,"admin_email":$email,"subdomain":$subdomain,"frontend_port":'"$NEXT_FRONTEND"',"backend_port":'"$NEXT_BACKEND"',"db_port":'"$NEXT_DB"'}]' \
       "$REGISTRY" > "${REGISTRY}.tmp" && mv "${REGISTRY}.tmp" "$REGISTRY"
fi

# Build and start tenant stack
echo "Building and starting tenant stack..."
cd "$TENANT_DIR"
docker-compose build --no-cache 2>/dev/null || docker-compose build
docker-compose up -d

# Wait for DB to be ready
echo "Waiting for database..."
sleep 15

# Create admin user (use backend container for bcrypt)
ADMIN_HASH=$(docker exec crm_${SLUG}_backend node -e "console.log(require('bcryptjs').hashSync('$ADMIN_PASSWORD', 10))" 2>/dev/null) || true
if [ -z "$ADMIN_HASH" ]; then
    # Fallback hash for Buzeye@2026
    ADMIN_HASH='$2a$10$5XAS7tIOlsDVD3/hfg73j.4oR.p5iMqpPdJu9/Pdj/MUIT2EnDBXW'
fi

TMP_SQL=$(mktemp)
cat > "$TMP_SQL" << EOF
INSERT INTO users (email, password, full_name, role)
VALUES ('$ADMIN_EMAIL', '$ADMIN_HASH', '$ADMIN_NAME', 'admin')
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, full_name = EXCLUDED.full_name, role = EXCLUDED.role;
EOF
docker exec -i crm_${SLUG}_database psql -U $DB_USER -d $DB_NAME < "$TMP_SQL" 2>/dev/null && echo "Admin user created" || echo "Run migrations manually if needed"
rm -f "$TMP_SQL"

# Register tenant in master database
echo "Registering tenant in master database..."
TMP_MASTER_SQL=$(mktemp)
cat > "$TMP_MASTER_SQL" << EOF
INSERT INTO tenants (
  slug, name, subdomain,
  db_name, db_user, db_password,
  frontend_port, backend_port, db_port,
  plan, status, admin_email, admin_name
) VALUES (
  '$SLUG',
  '$COMPANY_NAME',
  '${SLUG}.buzeye.com',
  '$DB_NAME',
  '$DB_USER',
  '$DB_PASSWORD',
  $NEXT_FRONTEND, $NEXT_BACKEND, $NEXT_DB,
  '$PLAN',
  'active',
  '$ADMIN_EMAIL',
  '$ADMIN_NAME'
) ON CONFLICT (slug) DO UPDATE
SET plan = '$PLAN',
    updated_at = CURRENT_TIMESTAMP;
EOF
docker exec -i crm_database psql -U crm_user -d crm_master < "$TMP_MASTER_SQL" 2>/dev/null && echo "Tenant registered in master DB with $PLAN plan" || echo "Warning: Could not register in master DB"
rm -f "$TMP_MASTER_SQL"

echo ""
echo "=========================================="
echo "Tenant provisioned: $SLUG"
echo "=========================================="
echo ""
echo "URL: http://${SLUG}.buzeye.com (add DNS + Nginx)"
echo "Direct: http://$(hostname -I | awk '{print $1}'):${NEXT_FRONTEND}"
echo ""
echo "Plan: $PLAN"
echo "Admin: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
echo ""
echo "NEXT STEPS:"
echo "1. DNS: $SLUG.buzeye.com → your server IP"
echo "2. Nginx: Include config from $NGINX_CONF"
echo "3. SSL: certbot --nginx -d ${SLUG}.buzeye.com"
echo ""
echo "=========================================="
