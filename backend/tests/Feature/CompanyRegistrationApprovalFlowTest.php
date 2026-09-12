<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Database\Seeders\SystemAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompanyRegistrationApprovalFlowTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Full happy-path flow:
     * Register -> Login immediately (no email verification / admin approval
     * required) -> API key generation blocked -> Admin approves the company
     * -> API key generation succeeds.
     */
    public function test_register_login_approve_then_generate_api_key(): void
    {
        $this->seed(SystemAdminSeeder::class);

        // 1. Register a new company/user.
        $registerResponse = $this->postJson('/api/v1/auth/register', [
            'company_name' => 'Integration Logistics',
            'name' => 'Jane Owner',
            'email' => 'jane@integration-logistics.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $registerResponse->assertStatus(201);
        $registerResponse->assertJsonPath('success', true);
        // Registration should confirm immediate access, not mention email verification.
        $this->assertStringNotContainsString('verify your email', strtolower($registerResponse->json('message')));

        $company = Company::where('business_email', 'jane@acme-logistics.test')->firstOrFail();
        $this->assertSame('pending_approval', $company->approval_status);
        $this->assertSame('Pending', $company->admin_verification_status);
        // The company itself should already be usable (active), independent of admin approval.
        $this->assertSame(Company::STATUS_ACTIVE, $company->status);

        // 2. Login immediately - should succeed without email verification or approval.
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'jane@acme-logistics.test',
            'password' => 'Password123!',
        ]);

        $loginResponse->assertStatus(200);
        $this->assertNotEmpty($loginResponse->json('token'));
        $token = $loginResponse->json('token');

        // 3. Attempting to generate an API key before approval must fail with a clear message.
        $blockedKeyResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/client/api-management/api-keys', [
                'name' => 'My Key',
            ]);

        $blockedKeyResponse->assertStatus(403);
        $this->assertStringContainsString('approved', strtolower($blockedKeyResponse->json('message')));

        // 4. Only a System Admin can approve the company.
        $admin = User::where('is_system_owner', true)->firstOrFail();
        $adminToken = $admin->createToken('admin-token')->plainTextToken;

        $approveResponse = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/companies/{$company->id}/approve");

        $approveResponse->assertStatus(200);

        $company->refresh();
        $this->assertSame('Verified', $company->admin_verification_status);
        $this->assertTrue($company->isAdminVerified());

        // 5. After approval, API key generation must succeed for the company user.
        $keyResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/client/api-management/api-keys', [
                'name' => 'My Key',
            ]);

        $keyResponse->assertStatus(201);
        $this->assertNotEmpty($keyResponse->json('data.secret'));
    }

    public function test_only_system_admin_can_approve_a_company(): void
    {
        $this->seed(SystemAdminSeeder::class);

        $this->postJson('/api/v1/auth/register', [
            'company_name' => 'Beta Co',
            'name' => 'Bob Owner',
            'email' => 'bob@beta-co.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertStatus(201);

        $company = Company::where('business_email', 'bob@beta-co.test')->firstOrFail();

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'bob@beta-co.test',
            'password' => 'Password123!',
        ]);

        $token = $loginResponse->json('token');

        // A regular company user must not be able to approve companies (including their own).
        $forbidden = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/companies/{$company->id}/approve");

        $forbidden->assertStatus(403);

        $company->refresh();
        $this->assertNotSame('Verified', $company->admin_verification_status);
    }
}
