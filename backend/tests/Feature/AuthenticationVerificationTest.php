<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use App\Notifications\QueuedPasswordReset;
use App\Notifications\QueuedVerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AuthenticationVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_rejects_duplicate_emails_case_insensitively(): void
    {
        Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Integration Logistics',
            'slug' => 'integration-logistics-' . uniqid(),
            'status' => 'active',
        ]);

        User::create([
            'company_id' => Company::latest()->first()->id,
            'uuid' => 'user-' . uniqid(),
            'name' => 'Existing User',
            'email' => 'existing@example.com',
            'password' => bcrypt('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/auth/register', [
            'company_name' => 'Northwind Delivery',
            'name' => 'New User',
            'email' => 'EXISTING@EXAMPLE.COM',
            'password' => 'UniqueLocalTestPass!2026',
            'password_confirmation' => 'UniqueLocalTestPass!2026',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'That email address is already registered. Please use a different email or sign in if you already have an account.']);
    }

    public function test_verification_link_can_only_be_used_once(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Momentum Logistics',
            'slug' => 'momentum-logistics-' . uniqid(),
            'status' => 'active',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'verify-' . uniqid(),
            'name' => 'Verifier',
            'email' => 'verify@example.com',
            'password' => bcrypt('Secret123!'),
            'status' => 'pending_verification',
        ]);

        $token = $user->beginEmailVerification();

        $verificationUrl = URL::temporarySignedRoute(
            'api.v1.auth.verify-email',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->getEmailForVerification()), 'token' => $token]
        );

        $firstResponse = $this->get($verificationUrl);
        $firstResponse->assertRedirect();

        $secondResponse = $this->get($verificationUrl);
        $secondResponse->assertRedirect();

        $location = $secondResponse->headers->get('location');
        $this->assertStringContainsString('/verify-email?status=success', $location);
        $this->assertStringContainsString('already verified', urldecode($location));
    }

    public function test_verification_email_targets_the_backend_verification_endpoint(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Northwind Logistics',
            'slug' => 'northwind-logistics-' . uniqid(),
            'status' => 'active',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'notify-' . uniqid(),
            'name' => 'Notifier',
            'email' => 'notify@example.com',
            'password' => bcrypt('Secret123!'),
            'status' => 'pending_verification',
        ]);

        $token = $user->beginEmailVerification();

        Notification::fake();
        Notification::send($user, new QueuedVerifyEmail($token));

        Notification::assertSentTo($user, QueuedVerifyEmail::class, function (QueuedVerifyEmail $notification) use ($user): bool {
            $mail = $notification->toMail($user);

            $this->assertStringContainsString('/api/v1/auth/verify-email?', $mail->actionUrl);
            $this->assertStringContainsString('token=', $mail->actionUrl);
            $this->assertStringStartsWith(url('/api/v1/auth/verify-email'), $mail->actionUrl);

            return true;
        });
    }

    public function test_resend_verification_email_is_generic_for_unknown_email(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/resend-verification', ['email' => 'missing@example.com']);

        $response->assertStatus(200);
        $response->assertJson(['message' => 'If an account exists for that email, a verification link has been sent.']);
        Notification::assertNothingSent();
    }

    public function test_resend_verification_email_sends_for_pending_verification_user(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Pacific Logistics',
            'slug' => 'pacific-logistics-' . uniqid(),
            'status' => 'active',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'resend-' . uniqid(),
            'name' => 'Resender',
            'email' => 'resend@example.com',
            'password' => bcrypt('Secret123!'),
            'status' => 'pending_verification',
        ]);

        Notification::fake();

        $response = $this->postJson('/api/v1/auth/resend-verification', ['email' => 'resend@example.com']);

        $response->assertStatus(200);
        $response->assertJson(['message' => 'If an account exists for that email, a verification link has been sent.']);
        Notification::assertSentTo($user, QueuedVerifyEmail::class, 1);
    }

    public function test_login_is_allowed_immediately_after_registration(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Instant Logistics',
            'slug' => 'instant-logistics-' . uniqid(),
            'status' => 'active',
        ]);

        User::create([
            'company_id' => $company->id,
            'uuid' => 'instant-' . uniqid(),
            'name' => 'Instant User',
            'email' => 'instant@example.com',
            'password' => bcrypt('Secret123!'),
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/auth/login', ['email' => 'instant@example.com', 'password' => 'Secret123!']);

        $response->assertStatus(200);
        $response->assertJsonFragment(['success' => true]);
    }

    public function test_login_is_allowed_for_email_verified_user_without_admin_approval(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Approval Queue Logistics',
            'slug' => 'approval-queue-logistics-' . uniqid(),
            'status' => 'active',
            'admin_verification_status' => 'Pending',
        ]);

        User::create([
            'company_id' => $company->id,
            'uuid' => 'approval-' . uniqid(),
            'name' => 'Verified User',
            'email' => 'approval@example.com',
            'password' => bcrypt('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/auth/login', ['email' => 'approval@example.com', 'password' => 'Secret123!']);

        $response->assertStatus(200);
        $response->assertJsonFragment(['success' => true]);
    }

    public function test_change_password_allows_strong_passwords_when_current_password_is_correct(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Secure Logistics',
            'slug' => 'secure-logistics-' . uniqid(),
            'status' => 'active',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'user-' . uniqid(),
            'name' => 'Secure User',
            'email' => 'secure@example.com',
            'password' => bcrypt('CurrentPass123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'CurrentPass123!',
            'password' => 'NewStrongPassword2026!',
            'password_confirmation' => 'NewStrongPassword2026!',
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment(['message' => 'Your password has been successfully updated. Please use your new credentials for future sign-ins.']);
        $this->assertTrue(password_verify('NewStrongPassword2026!', $user->fresh()->password));
    }

    public function test_client_company_password_change_accepts_valid_current_password_and_robust_new_password(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Client Company',
            'slug' => 'client-company-' . uniqid(),
            'status' => 'active',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'client-user-' . uniqid(),
            'name' => 'Client Manager',
            'email' => 'client-manager@example.com',
            'password' => bcrypt('CurrentPass123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        // Assign manager role so user has client.access permission
        $managerRole = \App\Models\Role::firstOrCreate(['name' => 'Manager'], ['description' => 'Company manager']);
        $user->roles()->syncWithoutDetaching($managerRole);

        $this->actingAs($user, 'sanctum');

        $response = $this->putJson('/api/v1/client/company/password', [
            'current_password' => 'CurrentPass123!',
            'password' => 'NewRobustPassword2026!',
            'password_confirmation' => 'NewRobustPassword2026!',
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment(['message' => 'Your password has been updated successfully.']);
        $this->assertTrue(password_verify('NewRobustPassword2026!', $user->fresh()->password));
    }

    public function test_password_reset_email_targets_the_frontend_reset_page(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Blue Harbor Logistics',
            'slug' => 'blue-harbor-logistics-' . uniqid(),
            'status' => 'active',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => 'reset-' . uniqid(),
            'name' => 'Reset User',
            'email' => 'reset@example.com',
            'password' => bcrypt('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        Notification::fake();
        Password::broker()->sendResetLink(['email' => $user->email]);

        Notification::assertSentTo($user, QueuedPasswordReset::class, function (QueuedPasswordReset $notification) use ($user): bool {
            $mail = $notification->toMail($user);

            $this->assertStringContainsString('/reset-password?', $mail->actionUrl);
            $this->assertStringContainsString('token=', $mail->actionUrl);
            $this->assertStringContainsString('email=', $mail->actionUrl);

            return true;
        });
    }
}
