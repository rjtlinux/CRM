#!/bin/bash

# Buzeye Rebranding - Quick Deploy Script
# This script deploys the Buzeye rebrand to production

set -e  # Exit on error

echo "🔷 Buzeye Rebranding Deployment"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "Please run this script from the CRM project root directory"
    exit 1
fi

echo "📝 Committing Buzeye rebrand changes..."
git add .
git commit -m "Rebrand to Buzeye: Logo, colors, domain support

- Add buzeye.com to Vite allowedHosts
- Update color theme to Buzeye brand (blue #4169E1, yellow #FDB913)
- Add Buzeye logo to sidebar, login, and favicon
- Replace 'CRM System' with 'Buzeye' throughout
- Update page title and translations
- Update README with Buzeye branding"

echo "✅ Changes committed"
echo ""

echo "🚀 Pushing to repository..."
git push origin main

echo "✅ Pushed to repository"
echo ""

echo "📦 Restarting frontend container..."
docker-compose restart frontend

echo "✅ Frontend restarted"
echo ""

echo "⏳ Waiting for frontend to be ready..."
sleep 5

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🔷 Buzeye is now live with:"
echo "   ✓ New logo in sidebar, login, and favicon"
echo "   ✓ Buzeye brand colors (blue & yellow)"
echo "   ✓ Domain support for buzeye.com"
echo "   ✓ Updated branding throughout"
echo ""
echo "🌐 Access your CRM at:"
echo "   - http://localhost:5173 (local)"
echo "   - http://buzeye.com (production)"
echo ""
echo "📋 Next steps:"
echo "   1. Test login page - should show Buzeye logo"
echo "   2. Check sidebar - should say 'Buzeye' with logo"
echo "   3. Verify domain works without 'blocked host' error"
echo "   4. Test language toggle - both Hindi and English"
echo ""
echo "🎉 Welcome to Buzeye!"
