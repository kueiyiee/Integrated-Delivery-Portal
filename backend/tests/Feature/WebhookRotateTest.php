<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Company;
use Illuminate\Support\Str;
use App\Models\WebhookEndpoint;
use Illuminate\Support\Facades\Crypt;
use App\Models\Role;
use App\Models\Permission;

class WebhookRotateTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_rotate_webhook_and_secret_is_returned_and_stored_encrypted()
    {
        // Create company and user
        $company = Company::forceCreate(["uuid" => (string) Str::uuid(), 'name' => 'ACME Co', 'slug' => Str::slug('ACME Co')]);

        $user = User::forceCreate([
            'company_id' => $company->id,
            'uuid' => (string) Str::uuid(),
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);

        $role = Role::firstOrCreate(['name' => 'Company Manager'], ['description' => 'Company manager', 'is_system' => false]);
        $permission = Permission::firstOrCreate(['name' => 'client.access'], ['description' => 'Access client portal']);
        $role->permissions()->syncWithoutDetaching($permission->id);
        $user->assignRole($role);

        // Create webhook with an initial secret
        $initial = 'wh_initial_secret_value';
        $webhook = WebhookEndpoint::create([
            'company_id' => $company->id,
            'name' => 'Test Webhook',
            'target_url' => 'https://example.com/webhook',
            'http_method' => 'POST',
            'status' => 'active',
            'secret_cipher' => Crypt::encryptString($initial),
        ]);

        // Act as the company user and rotate
        $this->actingAs($user, 'sanctum');
        $res = $this->postJson("/v1/client/api-management/webhooks/{$webhook->id}/rotate");
        $res->assertStatus(200);
        $data = $res->json('data');
        $this->assertArrayHasKey('secret', $data);
        $newSecret = $data['secret'];
        $this->assertNotEmpty($newSecret);
        $this->assertNotEquals($initial, $newSecret);

        // Refresh model and verify stored secret decrypts to newSecret
        $webhook->refresh();
        $this->assertEquals($newSecret, $webhook->getSecretPlain());
        $this->assertNotEquals($newSecret, $webhook->secret_cipher);
    }

    public function test_cannot_rotate_webhook_from_another_company()
    {
        $companyA = Company::forceCreate(['uuid' => (string) Str::uuid(), 'name' => 'A', 'slug' => Str::slug('A'), 'admin_verification_status' => 'Verified', 'admin_verified_at' => now()]);
        $companyB = Company::forceCreate(['uuid' => (string) Str::uuid(), 'name' => 'B', 'slug' => Str::slug('B'), 'admin_verification_status' => 'Verified', 'admin_verified_at' => now()]);

        $userB = User::forceCreate([
            'company_id' => $companyB->id,
            'uuid' => (string) Str::uuid(),
            'name' => 'Other',
            'email' => 'other@example.com',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);

        $role = Role::firstOrCreate(['name' => 'Company Manager'], ['description' => 'Company manager', 'is_system' => false]);
        $permission = Permission::firstOrCreate(['name' => 'client.access'], ['description' => 'Access client portal']);
        $role->permissions()->syncWithoutDetaching($permission->id);
        $userB->assignRole($role);

        $webhook = WebhookEndpoint::create([
            'company_id' => $companyA->id,
            'name' => 'A hook',
            'target_url' => 'https://a.example/webhook',
            'http_method' => 'POST',
            'status' => 'active',
            'secret_cipher' => Crypt::encryptString('secretA'),
        ]);

        $this->actingAs($userB, 'sanctum');
        $res = $this->postJson("/v1/client/api-management/webhooks/{$webhook->id}/rotate");
        $res->assertStatus(403);
    }
}
