<?php

namespace App\Models;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Role;
use App\Notifications\QueuedPasswordReset;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Casts\AsArrayObject;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, CanResetPassword;

    protected static function booted()
    {
        static::creating(function (User $user) {
            $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');

            if (strcasecmp($user->email, $systemEmail) === 0) {
                if (! app()->runningInConsole()) {
                    \Illuminate\Support\Facades\Log::warning('Blocked attempt to create system owner user', ['email' => $user->email]);
                    abort(403, 'Creation of platform owner account is restricted.');
                }
            }
        });

        static::updating(function (User $user) {
            $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');
            $isSystemAdmin = $user->is_system_owner || strcasecmp($user->email, $systemEmail) === 0;

            if ($isSystemAdmin) {
                $dirty = array_keys($user->getDirty());
                $protectedFields = ['email', 'company_id', 'status', 'is_system_owner'];

                foreach ($protectedFields as $field) {
                    if (in_array($field, $dirty, true)) {
                        abort(403, 'Protected system administrator account cannot be modified.');
                    }
                }
            }
        });
    }

    protected $fillable = [
        'company_id',
        'uuid',
        'name',
        'email',
        'password',
        'status',
        'is_system_owner',
        'email_verified_at',
        'approved_at',
        'approved_by',
        'approval_notes',
        'verification_token',
        'verification_sent_at',
        'verification_expires_at',
        'last_password_changed_at',
        'mfa_enabled',
        'mfa_secret',
        'recovery_codes',
        'profile_photo',
        'phone',
        'gender',
        'bio',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
        'recovery_codes',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'approved_at' => 'datetime',
        'verification_sent_at' => 'datetime',
        'verification_expires_at' => 'datetime',
        'is_system_owner' => 'boolean',
        'last_password_changed_at' => 'datetime',
        'mfa_enabled' => 'boolean',
        'webauthn_credentials' => 'array',
        'recovery_codes' => 'array',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function allPermissions(): Collection
    {
        $cacheKey = "user_permissions_{$this->id}";
        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 3600, function () {
            return $this->roles()
                ->with('permissions')
                ->get()
                ->flatMap(fn ($role) => $role->permissions)
                ->unique('id');
        });
    }

    public function hasRole(string $name): bool
    {
        return $this->roles()->where('name', $name)->exists();
    }

    public function hasPermission(string $permission): bool
    {
        return $this->roles()->whereHas('permissions', fn ($query) => $query->where('name', $permission))->exists();
    }

    public function assignRole(Role|string|int $role): self
    {
        $roleId = $role instanceof Role
            ? $role->id
            : (is_numeric($role) ? (int) $role : Role::where('name', $role)->value('id'));

        if ($roleId !== null) {
            $this->roles()->syncWithoutDetaching($roleId);
            // clear cached permissions for this user
            try { \Illuminate\Support\Facades\Cache::forget("user_permissions_{$this->id}"); } catch (\Exception $_) {}
        }

        return $this;
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(\App\Models\UserSession::class);
    }

    public function loginHistories(): HasMany
    {
        return $this->hasMany(\App\Models\LoginHistory::class);
    }

    public static function normalizeEmail(string $email): string
    {
        return trim(Str::lower($email));
    }

    public function setEmailAttribute($value): void
    {
        $this->attributes['email'] = static::normalizeEmail((string) $value);
    }

    public function beginEmailVerification(): string
    {
        $token = Str::random(64);
        $this->verification_token = hash('sha256', $token);
        $this->verification_sent_at = now();
        $this->verification_expires_at = now()->addMinutes((int) config('auth.verification.expire', 1440));
        $this->saveQuietly();

        return $token;
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new QueuedPasswordReset($token));
    }

    public function clearEmailVerificationToken(): void
    {
        $this->verification_token = null;
        $this->verification_expires_at = null;
    }

    public function consumeEmailVerification(string $token): bool
    {
        if (! $this->verification_token || ! $this->verification_expires_at) {
            return false;
        }

        if (now()->gt($this->verification_expires_at)) {
            $this->clearEmailVerificationToken();
            $this->saveQuietly();

            return false;
        }

        if (! hash_equals($this->verification_token, hash('sha256', $token))) {
            return false;
        }

        $this->email_verified_at = now();
        $this->approved_at = $this->approved_at ?? now();
        $this->status = 'active';
        $this->clearEmailVerificationToken();
        $this->save();

        return true;
    }

    public function isEmailVerified(): bool
    {
        return (bool) $this->email_verified_at;
    }

    public function isApproved(): bool
    {
        return (bool) $this->approved_at;
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isLocked(): bool
    {
        if ($this->locked_until === null) {
            return false;
        }

        return Carbon::now()->lessThanOrEqualTo($this->locked_until);
    }

    public function canLogin(?string &$reason = null): bool
    {
        $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');
        $isAdmin = $this->hasRole('Admin') || $this->is_system_owner || strcasecmp($this->email, $systemEmail) === 0;

        if ($this->status === 'suspended') {
            $reason = 'suspended';
            return false;
        }

        if ($this->status === 'disabled') {
            $reason = 'disabled';
            return false;
        }

        if ($this->isLocked()) {
            $reason = 'locked';
            return false;
        }

        if (! $this->isActive()) {
            $this->status = 'active';
            $this->email_verified_at = $this->email_verified_at ?? now();
            $this->saveQuietly();
        }

        if ($this->isSystemOwner() && $this->requiresPasswordRotation()) {
            $reason = 'password_rotation_required';
            return false;
        }

        return true;
    }

    public function isSystemOwner(): bool
    {
        $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');

        return $this->is_system_owner || strcasecmp($this->email, $systemEmail) === 0;
    }

    public function requiresPasswordRotation(): bool
    {
        $rotationDays = (int) config('auth.password_rotation_days', 90);
        if ($rotationDays <= 0) {
            return false;
        }

        if ($this->last_password_changed_at === null) {
            return true;
        }

        return now()->greaterThan($this->last_password_changed_at->copy()->addDays($rotationDays));
    }
}
