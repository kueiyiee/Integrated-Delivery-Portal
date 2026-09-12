<?php

namespace App\Enums;

enum RoleName: string
{
    case SYSTEM_ADMINISTRATOR = 'System Administrator';
    case COMPANY_MANAGER = 'Company Manager';
    case COMPANY_DISPATCHER = 'Company Dispatcher';
}
