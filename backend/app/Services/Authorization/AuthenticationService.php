<?php

namespace App\Services\Authorization;

use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;

class AuthenticationService
{
    public function authenticate(array $data): array
    {
        // use normalized email for indexed lookup (email stored normalized)
        $user = User::select([
                'id',
                'company_id',
                'email',
                'password',
                'status',
                'failed_login_attempts',
                'locked_until',
                'mfa_enabled',
                'email_verified_at',
                'approved_at',
                'is_system_owner',
                'last_password_changed_at',
            ])
            ->where('email', User::normalizeEmail($data['email']))
            ->first();

        if (! $user) {
            Log::warning('AuthenticationService@authenticate failed - user not found', ['email' => $data['email']]);
            abort(401, 'The email address or password you entered is not recognized. Please verify and try again.');
        }

        $check = Hash::check($data['password'], $user->password);

        if (! $check) {
            $user->increment('failed_login_attempts');

            $threshold = config('auth.lockout.failed_attempts', 5);
            $lockMinutes = config('auth.lockout.lock_minutes', 15);

            if ($user->failed_login_attempts >= $threshold) {
                $user->locked_until = now()->addMinutes($lockMinutes);
                $user->failed_login_attempts = 0;
            }

            $user->save();

            // increase IP/email rate limiter
            $key = 'login_attempt|' . strtolower($data['email']) . '|' . request()->ip();
            RateLimiter::hit($key, $lockMinutes * 60);

            // record login history
            \App\Models\LoginHistory::create([
                'user_id' => $user->id,
                'company_id' => $user->company_id,
                'ip_address' => request()->ip(),
                'browser' => request()->header('User-Agent'),
                'success' => false,
                'reason' => 'invalid_credentials',
                'metadata' => ['payload_present' => isset($data['password'])],
            ]);

            abort(401, 'The email address or password you entered is not recognized. Please verify and try again.');
        }

        // check login rules
        $reason = null;
        if (! $user->canLogin($reason)) {
            $supportEmail = config('platform.support_email', 'support@yourdomain.com');

            $messageMap = [
                'email_not_verified' => "We couldn't sign you in because your email has not been verified.",
                    'pending_approval' => 'Your account registration is awaiting approval by a system administrator.',
                    'company_not_approved' => 'Your company account requires administrative approval before sign-in is allowed. Please contact your administrator.',
                'not_active' => "Your account is not currently active. Please contact support at {$supportEmail} for assistance.",
                'locked' => 'Your account has been temporarily secured due to multiple unsuccessful login attempts. Please try again in 15 minutes or contact support if you need immediate assistance.',
                'suspended' => "Your account has been suspended. Please contact support at {$supportEmail} to discuss reinstatement.",
                'disabled' => 'Your account has been disabled. Please contact your system administrator for more information.',
                'password_rotation_required' => 'Your password must be updated before you can sign in. Please change your password to continue.',
            ];

            $message = $messageMap[$reason] ?? 'We were unable to authenticate your credentials. Please verify your information and try again.';

            \App\Models\LoginHistory::create([
                'user_id' => $user->id,
                'company_id' => $user->company_id,
                'ip_address' => request()->ip(),
                'browser' => request()->header('User-Agent'),
                'success' => false,
                'reason' => $reason,
            ]);

            abort(403, $message);
        }

        // successful login: reset counters
        $user->failed_login_attempts = 0;
        $user->locked_until = null;
        $user->save();

        // clear rate limiter for this identifier
        try {
            $key = 'login_attempt|' . strtolower($data['email']) . '|' . request()->ip();
            RateLimiter::clear($key);
        } catch (\Exception $e) {
            Log::warning('Failed to clear login rate limiter', ['error' => $e->getMessage()]);
        }

        // If user has MFA enabled and is not the configured system owner, require verification
        if ($user->mfa_enabled && ! $user->isSystemOwner()) {
            $challengeToken = Str::random(48);
            \App\Models\MfaChallenge::create([
                'user_id' => $user->id,
                'token' => $challengeToken,
                'expires_at' => now()->addMinutes(10),
            ]);

            \App\Models\LoginHistory::create([
                'user_id' => $user->id,
                'company_id' => $user->company_id,
                'ip_address' => request()->ip(),
                'browser' => request()->header('User-Agent'),
                'success' => true,
                'reason' => 'mfa_required',
            ]);

            return ['mfa_required' => true, 'challenge_token' => $challengeToken, 'user' => $user];
        }

        $token = $user->createToken('api-token')->plainTextToken;

        // create session record
        \App\Models\UserSession::create([
            'user_id' => $user->id,
            'company_id' => $user->company_id,
            'uuid' => (string) Str::uuid(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->header('User-Agent'),
            'last_activity' => now(),
            'expires_at' => now()->addDays(config('session.lifetime', 120)),
        ]);

        \App\Models\LoginHistory::create([
            'user_id' => $user->id,
            'company_id' => $user->company_id,
            'ip_address' => request()->ip(),
            'browser' => request()->header('User-Agent'),
            'success' => true,
            'reason' => 'authenticated',
        ]);

        Log::info('AuthenticationService@authenticate created token', ['token_snippet' => substr($token, 0, 8) . '...']);

        return ['token' => $token, 'user' => $user];
    }

    public function register(array $data): User
    {
        $normalizedEmail = User::normalizeEmail($data['email']);

        // Check if a company already claims this business email
        $existingCompany = Company::where('business_email', $normalizedEmail)->orderByDesc('id')->first();
        if ($existingCompany) {
            // If the previous company was auto-deleted, allow reuse of the email
            if ($existingCompany->deletion_type === Company::DELETION_TYPE_AUTO) {
                // allow registration to proceed and preserve audit history
            } else {
                // If the company is active, block. Otherwise block reuse unless an admin policy allows it.
                if ($existingCompany->status === Company::STATUS_ACTIVE) {
                    abort(422, 'This email is already registered with an active company.');
                }

                abort(422, 'This email is associated with an existing company account and cannot be used. Contact support for assistance.');
            }
        }

        // Also ensure no existing user account with this email exists (standard protection)
        $existingUser = User::where('email', $normalizedEmail)->first();
        if ($existingUser) {
            abort(422, 'That email address is already registered. Please use a different email or sign in if you already have an account.');
        }

        $companySlug = $this->createUniqueCompanySlug($data['company_name']);
        $companyCode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $companySlug), 0, 6) ?: 'CMP') . '-' . str_pad((string) ($this->nextCompanySequence() ?? 1000), 4, '0', STR_PAD_LEFT);

        $company = Company::create([
            'uuid' => Str::uuid()->toString(),
            'name' => $data['company_name'],
            'slug' => $companySlug,
            'status' => Company::STATUS_ACTIVE,
            'company_code' => $companyCode,
            'business_email' => $normalizedEmail,
            'email_verified_at' => now(),
            'approval_status' => 'pending_approval',
            'admin_verification_status' => 'Pending',
            'approval_stage' => 'pending_approval',
            'risk_level' => 'low',
            'risk_score' => 10,
            'subscription_status' => 'trial',
            'metadata' => [
                'verification_status' => 'verified',
                'document_review_status' => 'pending',
                'approval_status' => 'pending_approval',
            ],
        ]);

        $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');
        $isSystemAdmin = strcasecmp($normalizedEmail, $systemEmail) === 0;

        // Prevent runtime creation of additional system owner accounts via API
        if ($isSystemAdmin && ! app()->runningInConsole()) {
            // If the system owner already exists, ensure we don't create a duplicate
            $existing = User::where('email', $systemEmail)->first();
            if ($existing) {
                abort(403, 'Registration with the platform owner email is restricted.');
            }
        }

        $user = User::create([
            'company_id' => $company->id,
            'uuid' => Str::uuid()->toString(),
            'name' => $data['name'],
            'email' => $normalizedEmail,
            'password' => Hash::make($data['password']),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        if (! $isSystemAdmin) {
            // Notify the system owner that a new company requires review
            try {
                $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');
                $systemOwner = User::where('email', $systemEmail)->first();
                if ($systemOwner) {
                    \Illuminate\Support\Facades\Notification::send($systemOwner, new \App\Notifications\NewRegistrationForApproval($user));
                }
            } catch (\Exception $e) {
                Log::error('Failed to notify system owner of new registration', ['error' => $e->getMessage(), 'user' => $user->email]);
            }
        }

        // For self-registrations, assign the tenant-facing "Company Manager" role
        // rather than granting platform-wide Admin permissions. System owner
        // accounts remain protected and are created via seeders only.
        $managerRole = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Manager for a tenant company']
        );

        $managerPermissions = [
            'client.access' => 'Access client features',
            'manage.deliveries' => 'Manage deliveries',
            'manage.customers' => 'Manage customers',
            'manage.drivers' => 'Manage drivers',
        ];

        foreach ($managerPermissions as $name => $description) {
            $permission = Permission::firstOrCreate(
                ['name' => $name],
                ['description' => $description]
            );

            $managerRole->permissions()->syncWithoutDetaching($permission);
        }

        // Ensure system admin accounts are not inadvertently created here
        if ($isSystemAdmin) {
            // If running in console the DatabaseSeeder already handles creation.
            // In all other cases, avoid assigning tenant manager permissions.
            return $user;
        }

        $user->roles()->syncWithoutDetaching($managerRole);

        return $user;
    }

    private function createUniqueCompanySlug(string $companyName): string
    {
        $baseSlug = Str::slug($companyName) ?: 'company';
        $slug = $baseSlug;
        $counter = 1;

        while (Company::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    private function nextCompanySequence(): int
    {
        $lastCompany = Company::orderByDesc('id')->first();

        return $lastCompany ? max(1000, (int) $lastCompany->id + 1) : 1000;
    }
}
