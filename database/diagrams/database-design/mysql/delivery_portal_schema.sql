-- MySQL dump for delivery_portal
-- Compatible with XAMPP / phpMyAdmin
-- Import into database: delivery_portal

-- Seeded admin credentials (for initial development):
--   Admin:  systemadmin@d.com  / Adminsite21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

DROP DATABASE IF EXISTS `delivery_portal`;
CREATE DATABASE IF NOT EXISTS `delivery_portal` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `delivery_portal`;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `companies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `companies_uuid_unique` (`uuid`),
  UNIQUE KEY `companies_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `uuid` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_uuid_unique` (`uuid`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_company_id_foreign` (`company_id`),
  CONSTRAINT `users_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `deliveries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `uuid` char(36) NOT NULL,
  `tracking_number` varchar(255) NOT NULL,
  `external_reference` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `deliveries_uuid_unique` (`uuid`),
  UNIQUE KEY `deliveries_tracking_number_unique` (`tracking_number`),
  KEY `deliveries_company_id_foreign` (`company_id`),
  CONSTRAINT `deliveries_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_email_unique` (`email`),
  KEY `customers_company_id_foreign` (`company_id`),
  CONSTRAINT `customers_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `api_keys` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `key` varchar(255) NOT NULL,
  `secret_fingerprint` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_keys_key_unique` (`key`),
  KEY `api_keys_company_id_foreign` (`company_id`),
  CONSTRAINT `api_keys_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `webhook_endpoints` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `target_url` varchar(255) NOT NULL,
  `secret` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `events` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `webhook_endpoints_company_id_foreign` (`company_id`),
  CONSTRAINT `webhook_endpoints_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `drivers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `vehicle_type` varchar(255) NOT NULL,
  `license_number` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `drivers_company_id_foreign` (`company_id`),
  CONSTRAINT `drivers_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_resets` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  KEY `password_resets_email_index` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permission` (
  `role_id` bigint(20) unsigned NOT NULL,
  `permission_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `role_permission_permission_id_foreign` (`permission_id`),
  CONSTRAINT `role_permission_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permission_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_user` (
  `role_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`user_id`),
  KEY `role_user_user_id_foreign` (`user_id`),
  CONSTRAINT `role_user_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `company_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_foreign` (`user_id`),
  KEY `audit_logs_company_id_foreign` (`company_id`),
  CONSTRAINT `audit_logs_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `companies` (`id`, `uuid`, `name`, `slug`, `status`, `created_at`, `updated_at`) VALUES
  (1, UUID(), 'Acme Delivery Partners', 'acme-delivery', 'active', NOW(), NOW());

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
  (1, 'company_admin', 'Company administrator', NOW(), NOW()),
  (2, 'super_admin', 'Platform super administrator', NOW(), NOW()),
  (3, 'client', 'Delivery customer', NOW(), NOW());

INSERT INTO `permissions` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
  (1, 'admin.access', 'Access the admin console', NOW(), NOW()),
  (2, 'manage.api_keys', 'Manage API keys', NOW(), NOW()),
  (3, 'manage.webhooks', 'Manage webhook endpoints', NOW(), NOW()),
  (4, 'manage.drivers', 'Manage drivers', NOW(), NOW()),
  (5, 'manage.deliveries', 'Manage deliveries', NOW(), NOW()),
  (6, 'manage.customers', 'Manage customers', NOW(), NOW()),
  (7, 'view.audit_logs', 'View audit logs', NOW(), NOW()),
  (8, 'manage.settings', 'Manage company settings', NOW(), NOW()),
  (9, 'client.access', 'Access client features', NOW(), NOW());

INSERT INTO `role_permission` (`role_id`, `permission_id`) VALUES
  (1, 1),(1, 2),(1, 3),(1, 4),(1, 5),(1, 6),(1, 7),(1, 8),(1, 9),
  (2, 1),(2, 2),(2, 3),(2, 4),(2, 5),(2, 6),(2, 7),(2, 8),(2, 9),
  (3, 9);

INSERT INTO `users` (`id`, `company_id`, `uuid`, `name`, `email`, `password`, `status`, `created_at`, `updated_at`) VALUES
  (1, 1, UUID(), 'Acme Admin', 'admin@acme.com', '$2y$10$XJHij9rH/sbYDxo0I47M5eATbkBCX5pszk1WAl0/xRZ3HrVgXoKhu', 'active', NOW(), NOW()),
  (2, 1, UUID(), 'Super Admin', 'superadmin@acme.com', '$2y$10$XJHij9rH/sbYDxo0I47M5eATbkBCX5pszk1WAl0/xRZ3HrVgXoKhu', 'active', NOW(), NOW());

INSERT INTO `role_user` (`role_id`, `user_id`) VALUES
  (1, 1),
  (2, 2);

INSERT INTO `audit_logs` (`user_id`, `company_id`, `action`, `metadata`, `created_at`, `updated_at`) VALUES
  (1, 1, 'seeded initial company data', '{"seed":true}', NOW(), NOW());

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1,'2026_07_04_000001_create_companies_table',1),
(2,'2026_07_04_000002_create_users_table',1),
(3,'2026_07_04_000003_create_deliveries_table',1),
(4,'2026_07_04_000004_create_customers_table',1),
(5,'2026_07_04_000005_create_api_keys_table',1),
(6,'2026_07_04_000006_create_webhook_endpoints_table',1),
(7,'2026_07_04_000007_create_drivers_table',1),
(8,'2026_07_04_000008_create_audit_logs_table',1),
(9,'2026_07_04_000009_create_role_permission_tables',1),
(10,'2026_07_04_000010_create_password_resets_table',1);

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
