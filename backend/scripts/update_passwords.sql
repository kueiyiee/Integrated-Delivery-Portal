USE delivery_portal;

UPDATE users
SET password = '$2y$10$xwAF534T3fYVAZF8NBCI1OQ1pNQ9T6kWMwMchuJ8JEidg2AOXirjG'
WHERE email IN ('admin@acme.com','superadmin@acme.com');

SELECT id, email, CHAR_LENGTH(password) AS len, password FROM users WHERE email IN ('admin@acme.com','superadmin@acme.com');
