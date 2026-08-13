<?php

namespace App\Enums;

enum PermissionName: string
{
    case MANAGE_PLATFORM = 'manage.platform';
    case MANAGE_COMPANY = 'manage.company';
    case MANAGE_DISPATCHERS = 'manage.dispatchers';
    case APPROVE_DISPATCHERS = 'approve.dispatchers';
    case MANAGE_DRIVERS = 'manage.drivers';
    case MANAGE_CUSTOMERS = 'manage.customers';
    case MANAGE_DELIVERIES = 'manage.deliveries';
    case MANAGE_USERS = 'manage.users';
    case MANAGE_SETTINGS = 'manage.settings';
    case VIEW_ANALYTICS = 'view.analytics';
    case VIEW_AUDIT_LOGS = 'view.audit_logs';
    case MANAGE_API_KEYS = 'manage.api_keys';
    case MANAGE_NOTIFICATIONS = 'manage.notifications';
    case MANAGE_SYSTEM = 'manage.system';
    case CLIENT_ACCESS = 'client.access';
}
