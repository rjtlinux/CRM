#!/bin/bash
#
# Provision a new Buzeye CRM tenant (Separate Deployment Per Tenant - Option D)
# Each client gets: own subdomain, own database, own containers
#
# Usage: ./provision-tenant.sh <slug> "Company Name" admin@company.com "Admin Name"
#
# Example: ./provision-tenant.sh acme "Acme Corp" admin@acme.com "John Doe"
#          Creates: https://acme.buzeye.com with isolated DB and containers
#

set -e

SLUG=$1
COMPANY_NAME=$2
ADMIN_EMAIL=$3
ADMIN_NAME=${4:-"Admin"}
ADMIN_PASSWORD=${5:-"Buzeye@2026"}

if [ -z "$SLUG" ] || [ -z "$COMPANY_NAME" ] || [ -z "$ADMIN_EMAIL" ]; then
    echo "Usage: $0 <slug> \"Company Name\" admin@company.com [Admin Name] [Admin Password]"
    echo ""
    echo "Example: $0 acme \"Acme Corp\" admin@acme.com \"John Doe\""
    echo ""
    echo "Slug becomes subdomain: acme.buzeye.com"
    exit 1
fi

# Validate slug (alphanumeric, lowercase)
SLUG=$(echo "$SLUG" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
if [ -z "$SLUG" ]; then
    echo "Error: Invalid slug. Use only letters and numbers."
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
    volumes:
      - ${SLUG}_postgres_data:/var/lib/postgresql/data
      - ${BASE_DIR}/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ${BASE_DIR}/database/migrations/005_gst_compliance.sql:/docker-entrypoint-initdb.d/02-gst.sql
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
    environment:
      PORT: 5000
      NODE_ENV: production
      DB_HOST: database
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
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

echo ""
echo "=========================================="
echo "Tenant provisioned: $SLUG"
echo "=========================================="
echo ""
echo "URL: http://${SLUG}.buzeye.com (add DNS + Nginx)"
echo "Direct: http://$(hostname -I | awk '{print $1}'):${NEXT_FRONTEND}"
echo ""
echo "Admin: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
echo ""
echo "NEXT STEPS:"
echo "1. DNS: $SLUG.buzeye.com → your server IP"
echo "2. Nginx: Include config from $NGINX_CONF"
echo "3. SSL: certbot --nginx -d ${SLUG}.buzeye.com"
echo ""
echo "=========================================="
