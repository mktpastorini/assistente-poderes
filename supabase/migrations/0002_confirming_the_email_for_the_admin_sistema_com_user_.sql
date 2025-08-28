UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'admin@sistema.com';