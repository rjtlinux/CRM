-- Reset Admin Credentials for Buzeye CRM
-- Run this to create/reset the admin account

-- Delete existing admin user (if any)
DELETE FROM users WHERE email = 'admin@buzeye.com';
DELETE FROM users WHERE email = 'admin@crm.com';

-- Create new admin user
-- Email: admin@buzeye.com
-- Password: Buzeye@2026
INSERT INTO users (email, password, full_name, role)
VALUES (
    'admin@buzeye.com',
    '$2a$10$5XAS7tIOlsDVD3/hfg73j.4oR.p5iMqpPdJu9/Pdj/MUIT2EnDBXW',  -- Password: Buzeye@2026
    'Buzeye Admin',
    'admin'
);

-- Verify the admin user was created
SELECT id, email, full_name, role, created_at 
FROM users 
WHERE email = 'admin@buzeye.com';

-- Display login credentials
SELECT 
    '===================================' as separator,
    'BUZEYE ADMIN CREDENTIALS' as title,
    '===================================' as separator2,
    'Email: admin@buzeye.com' as email,
    'Password: Buzeye@2026' as password,
    '===================================' as separator3;
