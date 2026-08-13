<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Company;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class ReplaceAdmins extends Command
{
    protected $signature = 'admin:replace {email} {--password=}';
    protected $description = 'Deactivate existing admin users and create a single system administrator account';

    public function handle(): int
    {
        $email = $this->argument('email');
        $password = $this->option('password') ?? Str::random(24);

        $normalized = User::normalizeEmail($email);

        DB::transaction(function () use ($normalized, $email, $password) {
                        // Find users considered admin by role name
                        $admins = User::whereHas('roles', fn ($r) => $r->where('name', 'like', '%admin%')->orWhere('name', 'like', '%owner%'))->get();

            foreach ($admins as $admin) {
                if (strcasecmp($admin->email, $normalized) === 0) {
                    continue;
                }

                // Archive/deactivate admin user instead of hard delete
                $admin->roles()->detach();
                $admin->status = 'disabled';
                $admin->save();

                if (DB::getSchemaBuilder()->hasTable('audit_logs')) {
                    DB::table('audit_logs')->insert([
                        'user_id' => null,
                        'company_id' => null,
                        'action' => 'user.deactivated_as_admin',
                        'metadata' => json_encode(['target_user_id' => $admin->id, 'reason' => 'replaced_by_new_system_admin']),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
                $this->info('Deactivated admin: ' . $admin->email);
            }

            // Remove any existing user with the target email to create fresh
            $existing = User::where('email', $normalized)->first();
            if ($existing) {
                $existing->roles()->detach();
                $existing->delete();
                $this->info('Removed existing user with target email: ' . $normalized);
            }

            // Create system owner role if missing
            $role = Role::firstOrCreate(['name' => 'System Owner'], ['description' => 'Platform owner role']);
            if (DB::getSchemaBuilder()->hasColumn('roles', 'is_system')) {
                $role->is_system = true;
                $role->save();
            }


            // Ensure we have a company to associate (some schemas require non-null company_id)
            $company = Company::first();
            if (! $company) {
                $company = Company::create([
                    'uuid' => Str::uuid()->toString(),
                    'name' => 'Platform Owner Company',
                    'slug' => 'platform-owner',
                    'status' => Company::STATUS_ACTIVE,
                    'company_code' => 'PLTF-0001',
                    'business_email' => $normalized,
                ]);
            }

            // Create the new system admin user using only columns that exist in the users table
            $userPayload = [
                'company_id' => $company->id,
                'uuid' => Str::uuid()->toString(),
                'name' => 'System Administrator',
                'email' => $normalized,
                'password' => Hash::make($password),
                'status' => 'active',
                'is_system_owner' => true,
                'email_verified_at' => now(),
                'approved_at' => now(),
                'mfa_enabled' => true,
                'mfa_secret' => Str::random(32),
                'recovery_codes' => array_map(fn () => Str::random(10), range(1, 10)),
                'last_password_changed_at' => now(),
            ];

            $available = DB::getSchemaBuilder()->getColumnListing('users');
            $payload = array_intersect_key($userPayload, array_flip($available));

            $user = User::create($payload);

            $user->roles()->syncWithoutDetaching($role->id);

            if (DB::getSchemaBuilder()->hasTable('audit_logs')) {
                DB::table('audit_logs')->insert([
                    'user_id' => $user->id,
                    'company_id' => null,
                    'action' => 'user.created_system_admin',
                    'metadata' => json_encode(['email' => $normalized]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $this->info('Created system admin: ' . $normalized . ' (password provided in command)');
        });

        return self::SUCCESS;
    }
}
