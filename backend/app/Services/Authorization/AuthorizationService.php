<?php

namespace App\Services\Authorization;

use App\Enums\PermissionName;
use App\Enums\RoleName;
use App\Models\Role;
use App\Models\User;

class AuthorizationService
{
    public function canAssignRole(User $actor, string $roleName): bool
    {
        $roleName = trim($roleName);

        if ($actor->is_system_owner || $actor->hasRole(RoleName::SYSTEM_ADMINISTRATOR->value)) {
            return $roleName === RoleName::COMPANY_MANAGER->value;
        }

        if ($actor->hasRole(RoleName::COMPANY_MANAGER->value)) {
            return $roleName === RoleName::COMPANY_DISPATCHER->value;
        }

        return false;
    }

    public function canApproveCompany(User $actor): bool
    {
        return $actor->is_system_owner || $actor->hasRole(RoleName::SYSTEM_ADMINISTRATOR->value);
    }

    public function canApproveDispatcher(User $actor): bool
    {
        return $actor->hasRole(RoleName::COMPANY_MANAGER->value);
    }

    public function canAccessPlatform(User $user): bool
    {
        return $user->is_system_owner
            || $user->hasRole(RoleName::SYSTEM_ADMINISTRATOR->value)
            || $user->hasRole(RoleName::COMPANY_MANAGER->value)
            || $user->hasRole(RoleName::COMPANY_DISPATCHER->value);
    }

    public function canManageCompanyData(User $user, ?int $companyId = null): bool
    {
        if ($user->is_system_owner || $user->hasRole(RoleName::SYSTEM_ADMINISTRATOR->value)) {
            return true;
        }

        if ($companyId === null) {
            return false;
        }

        return $user->company_id === $companyId;
    }

    public function hasPermission(User $user, PermissionName|string $permission): bool
    {
        $permissionName = $permission instanceof PermissionName ? $permission->value : $permission;

        if ($user->is_system_owner || $user->hasRole(RoleName::SYSTEM_ADMINISTRATOR->value)) {
            return true;
        }

        return $user->hasPermission($permissionName);
    }
}
