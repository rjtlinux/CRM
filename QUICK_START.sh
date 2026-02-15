#!/bin/bash

# Buzeye CRM - Quick Start Script
# Sets up fresh admin account and restarts services

set -e

echo "🔷 Buzeye CRM - Quick Start"
echo "============================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "📦 Starting Docker services..."
docker-compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🔐 Creating fresh admin account..."
docker exec -i crm_database psql -U postgres crm < database/reset_admin.sql

echo "🔄 Restarting services..."
docker-compose restart backend frontend

echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "✅ Buzeye CRM is ready!"
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   🔷 BUZEYE ADMIN CREDENTIALS          ║"
echo "╠════════════════════════════════════════╣"
echo "║   Email:    admin@buzeye.com           ║"
echo "║   Password: Buzeye@2026                ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "🌐 Access URLs:"
echo "   Local:      http://localhost:5173"
echo "   Production: http://buzeye.com"
echo ""
echo "📋 What's New:"
echo "   ✓ Professional logo design with glow effects"
echo "   ✓ Buzeye brand colors (Blue & Gold)"
echo "   ✓ Fresh admin credentials"
echo "   ✓ Hindi/English language support"
echo "   ✓ Complete Indian market features"
echo ""
echo "🎉 Happy selling!"
