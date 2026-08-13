<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ClientApiManagementTest extends TestCase
{
    public function test_company_manager_can_list_company_api_keys(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Northwind Logistics',
            'slug' => 'northwind-logistics-' . uniqid(),
            'status' => 'active',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'user-' . uniqid(),
            'name' => 'Manager',
            'email' => 'manager-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Company manager', 'is_system' => false]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'client.access'],
            ['description' => 'Access client portal']
        );

        $role->permissions()->syncWithoutDetaching($permission->id);
        $user->assignRole($role);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/client/api-management/api-keys');

        $response->assertOk();
        $response->assertJsonStructure(['data']);
    }

    public function test_unapproved_company_cannot_create_api_key(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Unapproved Logistics',
            'slug' => 'unapproved-logistics-' . uniqid(),
            'status' => 'active',
            'admin_verification_status' => 'Pending',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'user-' . uniqid(),
            'name' => 'Manager',
            'email' => 'unapproved-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Company manager', 'is_system' => false]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'client.access'],
            ['description' => 'Access client portal']
        );

        $role->permissions()->syncWithoutDetaching($permission->id);
        $user->assignRole($role);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/client/api-management/api-keys', [
            'name' => 'Integration Key',
            'environment' => 'production',
        ]);

        $response->assertStatus(403);
    }

    public function test_unapproved_company_can_revoke_api_key(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Pending Approval Logistics',
            'slug' => 'pending-approval-logistics-' . uniqid(),
            'status' => 'active',
            'admin_verification_status' => 'Pending',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'user-' . uniqid(),
            'name' => 'Manager',
            'email' => 'manager-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Company manager', 'is_system' => false]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'client.access'],
            ['description' => 'Access client portal']
        );

        $role->permissions()->syncWithoutDetaching($permission->id);
        $user->assignRole($role);

        $apiKey = ApiKey::create([
            'company_id' => $company->id,
            'name' => 'Integration Key',
            'public_key' => 'pk_live_' . uniqid(),
            'secret_hash' => Hash::make('sk_live_' . uniqid()),
            'environment' => 'production',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/v1/client/api-management/api-keys/{$apiKey->id}/revoke");

        $response->assertOk();
        $this->assertSame('revoked', $apiKey->fresh()->status);
    }

    public function test_company_user_can_delete_api_key(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Delete Key Logistics',
            'slug' => 'delete-key-logistics-' . uniqid(),
            'status' => 'active',
            'admin_verification_status' => 'Verified',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'user-' . uniqid(),
            'name' => 'Manager',
            'email' => 'manager-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Company manager', 'is_system' => false]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'client.access'],
            ['description' => 'Access client portal']
        );

        $role->permissions()->syncWithoutDetaching($permission->id);
        $user->assignRole($role);

        $apiKey = ApiKey::create([
            'company_id' => $company->id,
            'name' => 'Integration Key',
            'public_key' => 'pk_live_' . uniqid(),
            'secret_hash' => Hash::make('sk_live_' . uniqid()),
            'environment' => 'production',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/client/api-management/api-keys/{$apiKey->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('api_keys', ['id' => $apiKey->id]);
    }

    public function test_company_manager_can_load_api_management_summary_data(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Acme Delivery',
            'slug' => 'acme-delivery-' . uniqid(),
            'status' => 'active',
            'admin_verification_status' => 'Verified',
            'admin_verified_at' => now(),
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'user-' . uniqid(),
            'name' => 'Owner',
            'email' => 'owner-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Company manager', 'is_system' => false]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'client.access'],
            ['description' => 'Access client portal']
        );

        $role->permissions()->syncWithoutDetaching($permission->id);
        $user->assignRole($role);

        $apiKey = ApiKey::create([
            'company_id' => $company->id,
            'name' => 'Integration Key',
            'public_key' => 'pk_live_' . uniqid(),
            'secret_hash' => Hash::make('sk_live_' . uniqid()),
            'environment' => 'production',
            'status' => 'active',
        ]);

        $docsResponse = $this->actingAs($user, 'sanctum')->getJson('/api/v1/client/api-management/documentation');
        $docsResponse->assertOk();
        $docsResponse->assertJsonPath('data.company_id', $company->id);

        $usageResponse = $this->actingAs($user, 'sanctum')->getJson('/api/v1/client/api-management/usage-statistics');
        $usageResponse->assertOk();
        $usageResponse->assertJsonPath('data.total_requests', 0);
        $usageResponse->assertJsonPath('data.keys.0.id', $apiKey->id);
    }

    public function test_company_manager_can_create_company_webhook_when_approved(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Acme Delivery',
            'slug' => 'acme-delivery-' . uniqid(),
            'status' => 'active',
            'admin_verification_status' => 'Verified',
            'admin_verified_at' => now(),
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'user-' . uniqid(),
            'name' => 'Owner',
            'email' => 'owner-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Company manager', 'is_system' => false]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'client.access'],
            ['description' => 'Access client portal']
        );

        $role->permissions()->syncWithoutDetaching($permission->id);
        $user->assignRole($role);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/client/api-management/webhooks', [
            'name' => 'Dispatch webhook',
            'target_url' => 'https://example.com/webhook',
            'http_method' => 'POST',
            'events' => ['delivery.created'],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.company_id', $company->id);
    }

    public function test_company_manager_cannot_create_customer_for_other_company(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Safe Logistics',
            'slug' => 'safe-logistics-' . uniqid(),
            'status' => 'active',
        ]);

        $otherCompany = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Other Logistics',
            'slug' => 'other-logistics-' . uniqid(),
            'status' => 'active',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'user-' . uniqid(),
            'name' => 'Manager',
            'email' => 'manager-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Company manager', 'is_system' => false]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'client.access'],
            ['description' => 'Access client portal']
        );

        $role->permissions()->syncWithoutDetaching($permission->id);
        $user->assignRole($role);

        $email = 'customer-' . uniqid() . '@example.com';

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/client/customers', [
            'name' => 'Cross Company Customer',
            'email' => $email,
            'phone' => '1234567890',
            'company_id' => $otherCompany->id,
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('customers', [
            'email' => $email,
            'company_id' => $company->id,
        ]);
        $this->assertDatabaseMissing('customers', [
            'email' => $email,
            'company_id' => $otherCompany->id,
        ]);
    }
}
