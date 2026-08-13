<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\Company;
use App\Models\LoginHistory;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CompanyDeletionLifecycleTest extends TestCase
{
    public function test_system_administrator_can_delete_company_and_isolate_company_owned_records(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Northwind Logistics',
            'slug' => 'northwind-logistics-' . uniqid(),
            'status' => 'active',
            'company_code' => 'NWL-1001',
            'business_email' => 'ops@northwind.example',
            'approval_status' => 'approved',
            'approval_stage' => 'approved',
            'subscription_status' => 'active',
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

        $admin = User::create([
            'company_id' => null,
            'uuid' => 'sys-admin-' . uniqid(),
            'name' => 'System Admin',
            'email' => 'sys-admin-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
            'is_system_owner' => true,
        ]);
        $admin->roles()->syncWithoutDetaching($role);

        $companyUser = User::create([
            'company_id' => $company->id,
            'uuid' => 'user-' . uniqid(),
            'name' => 'Company User',
            'email' => 'company-user-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        UserSession::create([
            'user_id' => $companyUser->id,
            'company_id' => $company->id,
            'uuid' => 'session-' . uniqid(),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'last_activity' => now(),
            'expires_at' => now()->addHour(),
            'revoked' => false,
        ]);

        LoginHistory::create([
            'user_id' => $companyUser->id,
            'company_id' => $company->id,
            'ip_address' => '127.0.0.1',
            'browser' => 'phpunit',
            'os' => 'linux',
            'device' => 'cli',
            'success' => true,
            'reason' => 'test',
            'occurred_at' => now(),
            'metadata' => ['test' => true],
        ]);

        ApiKey::create([
            'company_id' => $company->id,
            'name' => 'Test API Key',
            'public_key' => 'pk_test_' . uniqid(),
            'secret_hash' => Hash::make('super-secret'),
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/v1/admin/companies/' . $company->id, [
                'confirmation_name' => $company->name,
            ]);

        $response->assertOk();
        $response->assertJsonFragment(['message' => 'Company permanently deleted successfully.']);

        $this->assertNull(Company::find($company->id));
        $this->assertNull($companyUser->fresh()->company_id);
        $this->assertSame('disabled', $companyUser->fresh()->status);
        $this->assertDatabaseMissing('user_sessions', ['company_id' => $company->id]);
        $this->assertDatabaseMissing('login_histories', ['company_id' => $company->id]);
        $this->assertDatabaseMissing('api_keys', ['company_id' => $company->id]);
    }
}
