<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class SystemAdminLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_admin_can_login()
    {
        $email = 'systemadmin@d.com';
        $password = 'Adminsite@21';

        // Create system admin user with required auth metadata
        $user = User::create([
            'company_id' => null,
            'uuid' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => 'System Administrator',
            'email' => $email,
            'password' => Hash::make($password),
            'status' => 'active',
            'is_system_owner' => true,
            'email_verified_at' => now(),
            'approved_at' => now(),
            'mfa_enabled' => true,
            'mfa_secret' => 'JBSWY3DPEHPK3PXP',
            'recovery_codes' => ['recovery1', 'recovery2', 'recovery3'],
            'last_password_changed_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => $password,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true, 'mfa_required' => true]);
        $response->assertJsonStructure(['success', 'mfa_required', 'challenge_token']);
    }

    public function test_system_admin_password_rotation_prevents_login_without_change()
    {
        $email = 'systemadmin@d.com';
        $password = 'Adminsite@21';

        $user = User::create([
            'company_id' => null,
            'uuid' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => 'System Administrator',
            'email' => $email,
            'password' => Hash::make($password),
            'status' => 'active',
            'is_system_owner' => true,
            'email_verified_at' => now(),
            'approved_at' => now(),
            'mfa_enabled' => false,
            'last_password_changed_at' => now()->subDays(100),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => $password,
        ]);

        $response->assertStatus(403);
        $response->assertJson(['message' => 'Your password must be updated before you can sign in. Please change your password to continue.']);
    }
}
