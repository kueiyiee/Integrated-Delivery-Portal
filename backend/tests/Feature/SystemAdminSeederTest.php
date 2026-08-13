<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemAdminSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_admin_seeder_enforces_a_single_authoritative_system_owner(): void
    {
        User::create([
            'company_id' => null,
            'uuid' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => 'Legacy System Owner',
            'email' => 'legacy-owner@example.com',
            'password' => \Illuminate\Support\Facades\Hash::make('Password123!'),
            'status' => 'active',
            'is_system_owner' => true,
            'email_verified_at' => now(),
            'approved_at' => now(),
            'mfa_enabled' => false,
            'last_password_changed_at' => now(),
        ]);

        $this->artisan('db:seed', ['--class' => 'SystemAdminSeeder']);

        $systemOwners = User::where('is_system_owner', true)->get();

        $this->assertCount(1, $systemOwners);
        $this->assertSame('systemadmin@d.com', $systemOwners->first()->email);
        $this->assertTrue($systemOwners->first()->hasRole('System Administrator'));
        $this->assertSame('active', $systemOwners->first()->status);
    }
}
