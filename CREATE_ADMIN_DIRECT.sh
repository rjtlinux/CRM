#!/bin/bash

# Direct Admin Creation for Buzeye
# Run this on your production server

echo "🔷 Creating Buzeye Admin Account"
echo "================================"
echo ""

# Create admin directly in one command
docker exec -i crm_database psql -U crm_user -d crm_database <<EOF
-- Delete any existing admin accounts
DELETE FROM users WHERE email IN ('admin@buzeye.com', 'admin@crm.com');

-- Create new admin user
INSERT INTO users (email, password, full_name, role, created_at, updated_at)
VALUES (
    'admin@buzeye.com',
    '\$2a\$10\$5XAS7tIOlsDVD3/hfg73j.4oR.p5iMqpPdJu9/Pdj/MUIT2EnDBXW',
    'Buzeye Admin',
    'admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE 
SET 
    password = EXCLUDED.password,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- Show the created user
SELECT id, email, full_name, role, created_at FROM users WHERE email = 'admin@buzeye.com';
EOF

echo ""
echo "✅ Admin account created!"
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   🔐 LOGIN CREDENTIALS                 ║"
echo "╠════════════════════════════════════════╣"
echo "║   Email:    admin@buzeye.com           ║"
echo "║   Password: Buzeye@2026                ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Restart backend to clear any caches
echo "🔄 Restarting backend..."
docker-compose restart backend

echo ""
echo "✅ Ready to login!"
echo "🌐 Go to: http://buzeye.com:5173/login"
