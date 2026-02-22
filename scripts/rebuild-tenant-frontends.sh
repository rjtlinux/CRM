#!/bin/bash
# Rebuild frontend for all tenants (e.g. after Layout/sidebar fixes)
# Run from CRM root: ./scripts/rebuild-tenant-frontends.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TENANTS_DIR="${BASE_DIR}/tenants"

if [ ! -d "$TENANTS_DIR" ]; then
    echo "No tenants directory. Nothing to rebuild."
    exit 0
fi

for dir in "$TENANTS_DIR"/*/; do
    [ -d "$dir" ] || continue
    slug=$(basename "$dir")
    if [ -f "$dir/docker-compose.yml" ]; then
        echo "Rebuilding frontend for tenant: $slug"
        (cd "$dir" && docker-compose build --no-cache frontend && docker-compose up -d frontend)
        echo "  ✓ Done"
        echo ""
    fi
done

echo "All tenant frontends rebuilt."
