<?php

namespace Tests\Feature;

use App\Enums\PermissionName;
use App\Enums\RoleName;
use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Authorization\AuthorizationService;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EnterpriseAccessControlTest extends TestCase
{
    public function test_system_administrator_can_assign_company_manager_role(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Enterprise Solutions',
            'slug' => 'enterprise-solutions-' . uniqid(),
            'status' => 'pending',
        ]);

        $systemAdmin = User::create([
            'company_id' => $company->id,
            'uuid' => 'sys-admin-' . uniqid(),
            'name' => 'System Admin',
            'email' => 'enterprise-admin-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
            'is_system_owner' => true,
        ]);

        $role = Role::firstOrCreate(
            ['name' => RoleName::SYSTEM_ADMINISTRATOR->value],
            ['description' => 'System administrator', 'is_system' => true]
        );
        $systemAdmin->roles()->sync([$role->id]);

        $service = app(AuthorizationService::class);

        $this->assertTrue($service->canAssignRole($systemAdmin, RoleName::COMPANY_MANAGER->value));
        $this->assertFalse($service->canAssignRole($systemAdmin, RoleName::SYSTEM_ADMINISTRATOR->value));
    }

    public function test_company_manager_cannot_assign_system_administrator_role(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Northwind Express',
            'slug' => 'northwind-express-' . uniqid(),
            'status' => 'active',
        ]);

        $manager = User::create([
            'company_id' => $company->id,
            'uuid' => 'manager-' . uniqid(),
            'name' => 'Manager',
            'email' => 'manager-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $managerRole = Role::firstOrCreate(
            ['name' => RoleName::COMPANY_MANAGER->value],
            ['description' => 'Company manager', 'is_system' => false]
        );
        $manager->roles()->sync([$managerRole->id]);

        $service = app(AuthorizationService::class);

        $this->assertFalse($service->canAssignRole($manager, RoleName::SYSTEM_ADMINISTRATOR->value));
        $this->assertTrue($service->canAssignRole($manager, RoleName::COMPANY_DISPATCHER->value));
    }
}
