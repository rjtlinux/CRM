#!/bin/bash
# Fix: buzeye.com showing login instead of marketing site
# Run from CRM directory: ./scripts/fix-buzeye-marketing.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BASE_DIR"

echo "=========================================="
echo "Fixing Buzeye.com → Marketing Site"
echo "=========================================="

# 1. Build and start marketing
echo ""
echo "1. Starting marketing site (port 3000)..."
docker-compose -f docker-compose.full.yml up -d marketing 2>/dev/null || docker-compose -f docker-compose.marketing.yml up -d
sleep 3

# 2. Check if marketing is running
if docker ps | grep -q buzeye_marketing 2>/dev/null; then
  echo "   ✓ Marketing container running"
elif docker ps | grep -q marketing 2>/dev/null; then
  echo "   ✓ Marketing container running"
else
  echo "   Building marketing site (first time may take 1-2 min)..."
  docker-compose -f docker-compose.marketing.yml build --no-cache
  docker-compose -f docker-compose.marketing.yml up -d
  sleep 5
fi

# 3. Nginx instructions
echo ""
echo "2. Nginx must route buzeye.com → port 3000"
echo ""
echo "   Run these commands:"
echo "   sudo cp $BASE_DIR/nginx/buzeye-routing.conf /etc/nginx/sites-available/buzeye.conf"
echo "   sudo rm -f /etc/nginx/sites-enabled/default"
echo "   sudo ln -sf /etc/nginx/sites-available/buzeye.conf /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "   If you have SSL, certbot may have created separate configs."
echo "   Edit the server block for buzeye.com and set:"
echo "     proxy_pass http://127.0.0.1:3000;"
echo ""

# 4. Verify port 3000
echo "3. Verifying marketing on port 3000..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 2>/dev/null | grep -q 200; then
  echo "   ✓ Marketing site responding on port 3000"
else
  echo "   ⚠ Port 3000 not responding. Check: docker ps | grep marketing"
fi

echo ""
echo "=========================================="
echo "Summary:"
echo "  - buzeye.com, www.buzeye.com → port 3000 (marketing)"
echo "  - admin.buzeye.com → ports 5173 + 5000 (CRM)"
echo "=========================================="
