<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CompanyManagementListTest extends TestCase
{
    public function test_admin_company_index_returns_array_of_companies_for_management_ui(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Example Logistics Co',
            'slug' => 'example-logistics-co-' . uniqid(),
            'status' => 'pending',
            'company_code' => 'EXLG-1001',
            'business_email' => 'example-logistics@example.com',
            'approval_status' => 'registration_submitted',
            'approval_stage' => 'registration_submitted',
            'subscription_status' => 'trial',
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'System Administrator'],
            ['description' => 'System administrator', 'is_system' => true]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'manage.system'],
            ['description' => 'Manage the platform']
        );

        $role->permissions()->syncWithoutDetaching($permission);

        $user = User::create([
            'company_id' => null,
            'uuid' => 'user-' . uniqid(),
            'name' => 'System Admin',
            'email' => 'company-admin-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
            'is_system_owner' => true,
        ]);

        $user->roles()->syncWithoutDetaching($role);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/admin/companies');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [['id', 'name', 'business_email']],
            'meta' => ['total'],
        ]);
        $this->assertIsArray($response->json('data'));
        $this->assertTrue(collect($response->json('data'))->contains(fn ($item) => $item['id'] === $company->id && $item['name'] === $company->name));
    }
}
