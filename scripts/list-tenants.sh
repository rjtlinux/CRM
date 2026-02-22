#!/bin/bash
# List all provisioned tenants
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TENANTS_DIR="${BASE_DIR}/tenants"

echo "Buzeye CRM - Provisioned Tenants"
echo "================================"

if [ ! -d "$TENANTS_DIR" ]; then
    echo "No tenants yet. Run: ./provision-tenant.sh acme \"Acme Corp\" admin@acme.com"
    exit 0
fi

for dir in "$TENANTS_DIR"/*/; do
    [ -d "$dir" ] || continue
    slug=$(basename "$dir")
    if [ -f "$dir/.env" ]; then
        echo ""
        echo "Tenant: $slug"
        grep -E "^(COMPANY_NAME|ADMIN_EMAIL|FRONTEND_PORT|BACKEND_PORT)=" "$dir/.env" 2>/dev/null | sed 's/^/  /'
        echo "  URL: https://${slug}.buzeye.com"
    fi
done

echo ""
echo "Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep crm_ | head -20
