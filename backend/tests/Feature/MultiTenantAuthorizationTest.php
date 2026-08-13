<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\Company;
use App\Models\Delivery;
use App\Models\User;
use App\Models\WebhookEndpoint;
use Tests\TestCase;

class MultiTenantAuthorizationTest extends TestCase
{
    public function test_cross_tenant_delivery_access_forbidden(): void
    {
        $companyA = Company::create(['uuid' => uniqid('co_'), 'name' => 'Company A', 'slug' => 'company-a-' . uniqid()]);
        $companyB = Company::create(['uuid' => uniqid('co_'), 'name' => 'Company B', 'slug' => 'company-b-' . uniqid()]);

            $userA = User::create(['name' => 'User A', 'email' => 'a+' . uniqid() . '@example.test', 'password' => bcrypt('password'), 'company_id' => $companyA->id]);
            $userB = User::create(['name' => 'User B', 'email' => 'b+' . uniqid() . '@example.test', 'password' => bcrypt('password'), 'company_id' => $companyB->id]);

        $deliveryB = Delivery::create(['company_id' => $companyB->id, 'uuid' => uniqid('d_'), 'tracking_number' => 'TRK' . uniqid(), 'status' => Delivery::STATUS_PENDING]);

        $this->withoutMiddleware();
        $resp = $this->actingAs($userA, 'sanctum')->getJson("/v1/client/deliveries/{$deliveryB->id}");
        $this->assertTrue(in_array($resp->status(), [403, 404], true), 'Expected forbidden or not found for cross-tenant delivery access');
    }

    public function test_cross_tenant_delivery_delete_forbidden(): void
    {
        $companyA = Company::create(['uuid' => uniqid('co_'), 'name' => 'Company A2', 'slug' => 'company-a2-' . uniqid()]);
        $companyB = Company::create(['uuid' => uniqid('co_'), 'name' => 'Company B2', 'slug' => 'company-b2-' . uniqid()]);

        $userA = User::create(['name' => 'User A2', 'email' => 'a+' . uniqid() . '@example.test', 'password' => bcrypt('password'), 'company_id' => $companyA->id]);
        $deliveryB = Delivery::create(['company_id' => $companyB->id, 'uuid' => uniqid('d_'), 'tracking_number' => 'TRK' . uniqid(), 'status' => Delivery::STATUS_PENDING]);

        $this->withoutMiddleware();
        $resp = $this->actingAs($userA, 'sanctum')->deleteJson("/v1/client/deliveries/{$deliveryB->id}");
        $this->assertTrue(in_array($resp->status(), [403, 404], true), 'Expected forbidden or not found when deleting a delivery from another company');
    }

    public function test_cross_tenant_webhook_rotation_forbidden(): void
    {
        $companyA = Company::create(['uuid' => uniqid('co_'), 'name' => 'Company A2', 'slug' => 'company-a2-' . uniqid()]);
        $companyB = Company::create(['uuid' => uniqid('co_'), 'name' => 'Company B2', 'slug' => 'company-b2-' . uniqid()]);

            $userA = User::create(['name' => 'User A2', 'email' => 'aa+' . uniqid() . '@example.test', 'password' => bcrypt('password'), 'company_id' => $companyA->id]);

        $webhookB = WebhookEndpoint::create([
            'company_id' => $companyB->id,
            'name' => 'B webhook',
            'target_url' => 'https://example.com/hook',
            'http_method' => 'POST',
            'secret_cipher' => encrypt('sk_test_secret'),
            'status' => 'active',
        ]);

        $this->withoutMiddleware();
        $resp = $this->actingAs($userA, 'sanctum')->postJson("/v1/client/api-management/webhooks/{$webhookB->id}/rotate");
        $this->assertTrue(in_array($resp->status(), [403, 404], true), 'Expected forbidden or not found when rotating webhook from another company');
    }

    public function test_cross_tenant_api_key_revoke_forbidden(): void
    {
        $companyA = Company::create(['uuid' => uniqid('co_'), 'name' => 'Company A3', 'slug' => 'company-a3-' . uniqid()]);
        $companyB = Company::create(['uuid' => uniqid('co_'), 'name' => 'Company B3', 'slug' => 'company-b3-' . uniqid()]);

        $userA = User::create(['uuid' => uniqid('u_'), 'name' => 'User A3', 'email' => 'aaa+' . uniqid() . '@example.test', 'password' => bcrypt('password'), 'company_id' => $companyA->id]);

        $apiKeyB = ApiKey::create([
            'company_id' => $companyB->id,
            'name' => 'Key B',
            'public_key' => 'pk_test_' . uniqid(),
            'secret_hash' => bcrypt('sk_test_b'),
            'status' => 'active',
        ]);

        $this->withoutMiddleware();
        $resp = $this->actingAs($userA, 'sanctum')->postJson("/v1/client/api-management/api-keys/{$apiKeyB->id}/revoke");
        $this->assertTrue(in_array($resp->status(), [403, 404], true), 'Expected forbidden or not found when revoking API key from another company');
    }

    public function test_company_user_can_revoke_api_key(): void
    {
        $company = Company::create([
            'uuid' => uniqid('co_'),
            'name' => 'Verified Company',
            'slug' => 'verified-company-' . uniqid(),
            'admin_verification_status' => 'Verified',
        ]);

        $user = User::create([
            'name' => 'Company User',
            'email' => 'user+' . uniqid() . '@example.test',
            'password' => bcrypt('password'),
            'company_id' => $company->id,
        ]);

        $apiKey = ApiKey::create([
            'company_id' => $company->id,
            'name' => 'Company Key',
            'public_key' => 'pk_test_' . uniqid(),
            'secret_hash' => bcrypt('sk_test_secret'),
            'status' => 'active',
        ]);

        $this->withoutMiddleware();
        $resp = $this->actingAs($user, 'sanctum')->postJson("/v1/client/api-management/api-keys/{$apiKey->id}/revoke");

        $resp->assertStatus(200);
        $this->assertSame('revoked', $resp->json('data.status'));
        $this->assertSame('revoked', $apiKey->fresh()->status);
    }

    public function test_cross_tenant_user_update_forbidden(): void
    {
        $companyA = Company::create(['uuid' => uniqid('co_'), 'name' => 'Company A4', 'slug' => 'company-a4-' . uniqid()]);
        $companyB = Company::create(['uuid' => uniqid('co_'), 'name' => 'Company B4', 'slug' => 'company-b4-' . uniqid()]);

            $userA = User::create(['name' => 'User A4', 'email' => 'aaaa+' . uniqid() . '@example.test', 'password' => bcrypt('password'), 'company_id' => $companyA->id]);
            $userB = User::create(['name' => 'User B4', 'email' => 'bbbb+' . uniqid() . '@example.test', 'password' => bcrypt('password'), 'company_id' => $companyB->id]);

        $this->withoutMiddleware();
        $resp = $this->actingAs($userA, 'sanctum')->putJson("/v1/client/company/users/{$userB->id}", ['name' => 'Hacked']);
        $this->assertTrue(in_array($resp->status(), [403, 404], true), 'Expected forbidden or not found when updating a user from another company');
    }
}
