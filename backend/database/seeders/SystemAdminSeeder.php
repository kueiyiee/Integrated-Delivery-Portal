<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SystemAdminSeeder extends Seeder
{
    public function run(): void
    {
        $systemRoleName = config('platform.system_role_name', 'System Administrator');
        $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');

        $systemRole = Role::firstOrCreate(
            ['name' => $systemRoleName],
            ['description' => 'Permanent system owner role', 'is_system' => true]
        );

        $permissions = [
            'admin.access' => 'Access the admin console',
            'manage.api_keys' => 'Manage API keys',
            'manage.webhooks' => 'Manage webhook endpoints',
            'manage.users' => 'Manage users',
            'manage.roles' => 'Manage roles and assignments',
            'manage.company' => 'Manage company records',
            'manage.documents' => 'Manage company documents',
            'manage.drivers' => 'Manage drivers',
            'manage.deliveries' => 'Manage deliveries',
            'manage.customers' => 'Manage customers',
            'view.audit_logs' => 'View audit logs',
            'manage.settings' => 'Manage company settings',
            'client.access' => 'Access client features',
            'manage.system' => 'Full delivery portal management',
        ];

        foreach ($permissions as $name => $description) {
            $permission = Permission::firstOrCreate(['name' => $name], ['description' => $description]);
            $systemRole->permissions()->syncWithoutDetaching($permission);
        }

        $existingSystemOwner = User::where('is_system_owner', true)->first();
        $systemAdminCandidate = User::where('email', $systemEmail)->first();
        $primaryOwner = $existingSystemOwner ?? $systemAdminCandidate;

        if ($primaryOwner !== null) {
            $primaryOwner->forceFill([
                'company_id' => null,
                'uuid' => $primaryOwner->uuid ?? Str::uuid()->toString(),
                'name' => 'System Administrator',
                'email' => $systemEmail,
                'password' => Hash::make('Adminsite@21'),
                'status' => 'active',
                'is_system_owner' => true,
                'email_verified_at' => $primaryOwner->email_verified_at ?? now(),
                'approved_at' => $primaryOwner->approved_at ?? now(),
                'approved_by' => $primaryOwner->approved_by ?? null,
                'mfa_enabled' => false,
                'mfa_secret' => null,
                'recovery_codes' => $primaryOwner->recovery_codes ?? collect(range(1, 10))->map(fn () => Str::random(10))->all(),
                'last_password_changed_at' => $primaryOwner->last_password_changed_at ?? now(),
            ])->saveQuietly();

            $primaryOwner->refresh();
            $primaryOwner->roles()->syncWithoutDetaching($systemRole);
            $primaryOwner->assignRole($systemRole);

            User::where('id', '!=', $primaryOwner->id)
                ->where(function ($query) use ($systemEmail): void {
                    $query->where('is_system_owner', true)
                        ->orWhere('email', $systemEmail);
                })
                ->cursor()
                ->each(function (User $user) {
                    $user->forceFill([
                        'is_system_owner' => false,
                        'email' => 'disabled_' . Str::uuid()->toString() . '@local.invalid',
                    ])->saveQuietly();
                });

            return;
        }

        User::create([
            'company_id' => null,
            'uuid' => Str::uuid()->toString(),
            'name' => 'System Administrator',
            'email' => $systemEmail,
            'password' => Hash::make('Adminsite@21'),
            'status' => 'active',
            'is_system_owner' => true,
            'email_verified_at' => now(),
            'approved_at' => now(),
            'mfa_enabled' => false,
            'mfa_secret' => null,
            'recovery_codes' => collect(range(1, 10))->map(fn () => Str::random(10))->all(),
            'last_password_changed_at' => now(),
        ])->roles()->syncWithoutDetaching($systemRole);
    }
}
