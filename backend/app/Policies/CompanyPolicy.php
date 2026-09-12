<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

class CompanyPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_system_owner || $user->hasRole('System Administrator') || $user->hasRole('Company Manager');
    }

    public function view(User $user, Company $company): bool
    {
        if ($user->is_system_owner || $user->hasRole('System Administrator')) {
            return true;
        }

        return $user->company_id === $company->id;
    }

    public function approve(User $user, Company $company): bool
    {
        return $user->is_system_owner || $user->hasRole('System Administrator');
    }

    public function reject(User $user, Company $company): bool
    {
        return $user->approve($user, $company);
    }

    public function suspend(User $user, Company $company): bool
    {
        return $user->is_system_owner || $user->hasRole('System Administrator');
    }

    public function activate(User $user, Company $company): bool
    {
        return $user->is_system_owner || $user->hasRole('System Administrator');
    }

    public function delete(User $user, Company $company): bool
    {
        return $user->is_system_owner || $user->hasRole('System Administrator');
    }
}
