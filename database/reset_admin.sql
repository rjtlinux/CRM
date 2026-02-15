-- Reset Admin Credentials for Buzeye CRM
-- Run this to create/reset the admin account

-- Delete existing admin users (if any)
DELETE FROM users WHERE email = 'admin@buzeye.com';
DELETE FROM users WHERE email = 'admin@crm.com';

-- Create new admin user
-- Email: admin@buzeye.com
-- Password: Buzeye@2026
INSERT INTO users (email, password, full_name, role)
VALUES (
    'admin@buzeye.com',
    '$2a$10$5XAS7tIOlsDVD3/hfg73j.4oR.p5iMqpPdJu9/Pdj/MUIT2EnDBXW',
    'Buzeye Admin',
    'admin'
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the admin user was created
\echo ''
\echo '===================================='
\echo 'BUZEYE ADMIN CREDENTIALS CREATED'
\echo '===================================='
\echo 'Email: admin@buzeye.com'
\echo 'Password: Buzeye@2026'
\echo '===================================='
\echo ''

SELECT id, email, full_name, role, created_at 
FROM users 
WHERE email = 'admin@buzeye.com';
