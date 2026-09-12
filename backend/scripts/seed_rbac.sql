USE delivery_portal;

-- Insert roles
INSERT INTO roles (`name`,`description`,`created_at`,`updated_at`) VALUES
('company_admin','Company administrator',NOW(),NOW()),
('super_admin','Platform super administrator',NOW(),NOW()),
('client','Delivery customer',NOW(),NOW());

-- Insert permissions
INSERT INTO permissions (`name`,`description`,`created_at`,`updated_at`) VALUES
('admin.access','Access the admin console',NOW(),NOW()),
('manage.api_keys','Manage API keys',NOW(),NOW()),
('manage.webhooks','Manage webhook endpoints',NOW(),NOW()),
('manage.drivers','Manage drivers',NOW(),NOW()),
('manage.deliveries','Manage deliveries',NOW(),NOW()),
('manage.customers','Manage customers',NOW(),NOW()),
('view.audit_logs','View audit logs',NOW(),NOW()),
('manage.settings','Manage company settings',NOW(),NOW()),
('client.access','Access client features',NOW(),NOW());

-- Map all permissions to company_admin and super_admin
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.name IN ('company_admin','super_admin');

-- Map client.access to client role only
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.name = 'client' AND p.name = 'client.access';

-- Assign roles to seeded users
INSERT INTO role_user (role_id, user_id)
SELECT r.id, u.id FROM roles r JOIN users u ON u.email = 'admin@acme.com' WHERE r.name = 'company_admin';

INSERT INTO role_user (role_id, user_id)
SELECT r.id, u.id FROM roles r JOIN users u ON u.email = 'superadmin@acme.com' WHERE r.name = 'super_admin';

-- Add an audit log for seeding
INSERT INTO audit_logs (user_id, company_id, action, metadata, created_at, updated_at)
VALUES ((SELECT id FROM users WHERE email='admin@acme.com' LIMIT 1), (SELECT id FROM companies LIMIT 1), 'seeded rbac', '{"seed":true}', NOW(), NOW());

-- Verify counts
SELECT (SELECT COUNT(*) FROM roles) AS roles_count, (SELECT COUNT(*) FROM permissions) AS permissions_count, (SELECT COUNT(*) FROM role_permission) AS role_permission_count, (SELECT COUNT(*) FROM role_user) AS role_user_count;
