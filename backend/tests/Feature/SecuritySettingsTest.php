<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\LoginHistory;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecuritySettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_fetch_security_summary(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'status' => 'active',
            'mfa_enabled' => false,
        ]);

        LoginHistory::create([
            'user_id' => $user->id,
            'company_id' => null,
            'ip_address' => '127.0.0.1',
            'browser' => 'Chrome',
            'success' => true,
            'reason' => 'authenticated',
            'occurred_at' => now(),
        ]);

        UserSession::create([
            'user_id' => $user->id,
            'company_id' => null,
            'uuid' => 'session-1',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0',
            'browser' => 'Chrome',
            'os' => 'Windows',
            'device' => 'Desktop',
            'last_activity' => now(),
            'expires_at' => now()->addDays(7),
            'revoked' => false,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'company_id' => null,
            'action' => 'profile.updated',
            'metadata' => ['source' => 'web'],
        ]);

        Sanctum::actingAs($user, ['*']);

        $response = $this->getJson('/api/v1/auth/security/summary');

        $response->assertOk()
            ->assertJsonPath('mfa_enabled', false)
            ->assertJsonPath('sessions.0.device', 'Desktop')
            ->assertJsonPath('login_history.0.reason', 'authenticated')
            ->assertJsonPath('activity_logs.0.action', 'profile.updated');
    }

    public function test_authenticated_user_can_revoke_a_session(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'status' => 'active',
        ]);

        $session = UserSession::create([
            'user_id' => $user->id,
            'company_id' => null,
            'uuid' => 'session-2',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0',
            'browser' => 'Chrome',
            'os' => 'Windows',
            'device' => 'Tablet',
            'last_activity' => now(),
            'expires_at' => now()->addDays(7),
            'revoked' => false,
        ]);

        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/v1/auth/security/sessions/' . $session->id . '/revoke');

        $response->assertOk();
        $this->assertTrue($session->fresh()->revoked);
    }
}
