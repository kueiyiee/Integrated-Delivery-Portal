<?php

namespace App\Providers;

use App\Models\Company;
use App\Models\Permission;
use App\Models\User;
use App\Policies\CompanyPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Company::class => CompanyPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();

        try {
            if (Schema::hasTable('permissions')) {
                Permission::all()->each(function (Permission $permission) {
                    Gate::define(
                        $permission->name,
                        fn (User $user) => $user->hasPermission($permission->name)
                    );
                });
            }
        } catch (\Throwable $exception) {
            // Tables may not exist during initial install or migration.
        }
    }
}
