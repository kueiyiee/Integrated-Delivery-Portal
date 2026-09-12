<?php

namespace App\Models;

use App\Models\ApiKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class Company extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_PENDING = 'pending';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_UNDER_REVIEW = 'under_review';
    public const STATUS_PENDING_EMAIL_VERIFICATION = 'pending_email_verification';
    public const STATUS_EMAIL_VERIFIED = 'email_verified';
    public const STATUS_PENDING_APPROVAL = 'pending_approval';
    public const STATUS_ARCHIVED = 'archived';
    public const STATUS_LOCKED = 'locked';
    public const DELETION_TYPE_AUTO = 'auto_deleted';
    public const DELETION_TYPE_ADMIN = 'admin_deleted';
    public const DELETION_TYPE_USER = 'user_deleted';

    protected $fillable = [
        'uuid',
        'name',
        'slug',
        'status',
        'metadata',
        'company_code',
        'business_email',
        'phone',
        'address',
        'about',
        'business_hours',
        'social_links',
        'business_registration_number',
        'tax_number',
        'industry',
        'country',
        'region',
        'approval_status',
        'approval_stage',
        'approval_reference',
        'risk_level',
        'risk_score',
        'subscription_status',
        'email_verified_at',
        'admin_verified_at',
        'admin_verified_by',
        'admin_verification_status',
        'admin_verification_note',
        'verification_token',
        'verification_token_expiry',
        'verification_attempts',
        'last_verification_request',
        'verification_ip',
        'verification_device',
        'verification_browser',
        'verification_history',
        'review_started_at',
        'approved_at',
        'approved_by',
        'suspended_at',
        'archived_at',
        'last_activity_at',
        'deletion_type',
        'deletion_reason',
    ];

    protected $casts = [
        'metadata' => 'array',
        'business_hours' => 'array',
        'social_links' => 'array',
        'email_verified_at' => 'datetime',
        'admin_verified_at' => 'datetime',
        'verification_token_expiry' => 'datetime',
        'last_verification_request' => 'datetime',
        'review_started_at' => 'datetime',
        'approved_at' => 'datetime',
        'suspended_at' => 'datetime',
        'archived_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'verification_history' => 'array',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function adminVerifier()
    {
        return $this->belongsTo(User::class, 'admin_verified_by');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    public function isEmailVerified(): bool
    {
        return ! is_null($this->email_verified_at);
    }

    public function isAdminVerified(): bool
    {
        if ($this->admin_verification_status !== null) {
            return $this->admin_verification_status === 'Verified';
        }

        return $this->approval_status === 'approved';
    }

    public function getAdminApprovalStatus(): string
    {
        if ($this->admin_verification_status !== null) {
            return $this->admin_verification_status;
        }

        return match ($this->approval_status) {
            'approved' => 'Verified',
            'rejected' => 'Rejected',
            default => 'Pending',
        };
    }

    public function isAdminRejected(): bool
    {
        return $this->admin_verification_status === 'Rejected';
    }

    public function isFullyVerified(): bool
    {
        return $this->isEmailVerified() && $this->isAdminVerified();
    }

    public function isPartiallyVerified(): bool
    {
        return $this->isEmailVerified() && ! $this->isAdminVerified();
    }

    public function verificationStatusLabel(): string
    {
        if ($this->isFullyVerified()) {
            return 'Fully Verified';
        }

        if ($this->isPartiallyVerified()) {
            return 'Partially Verified';
        }

        if (! $this->isEmailVerified() && $this->isAdminRejected()) {
            return 'Not Verified';
        }

        return 'Partially Verified';
    }

    public function beginEmailVerification(): string
    {
        $token = Str::random(64);
        $this->forceFill([
            'verification_token' => hash('sha256', $token),
            'verification_token_expiry' => now()->addDay(),
            'verification_attempts' => 0,
            'last_verification_request' => now(),
            'status' => self::STATUS_PENDING_EMAIL_VERIFICATION,
            'approval_stage' => 'registration_submitted',
            'approval_status' => 'registration_submitted',
        ]);
        $this->save();

        return $token;
    }

    public function markEmailVerified(?string $ip = null, ?string $device = null, ?string $browser = null): void
    {
        $this->forceFill([
            'email_verified_at' => now(),
            'verification_token' => null,
            'verification_token_expiry' => null,
            'verification_attempts' => ($this->verification_attempts ?? 0) + 1,
            'verification_ip' => $ip,
            'verification_device' => $device,
            'verification_browser' => $browser,
            'status' => self::STATUS_ACTIVE,
            'approval_stage' => 'email_verified',
            'approval_status' => $this->approval_status === 'approved' ? 'approved' : 'email_verified',
            'metadata' => array_merge($this->metadata ?? [], [
                'verification_status' => 'verified',
                'verification_completed_at' => now()->toISOString(),
            ]),
            'verification_history' => array_values(array_merge($this->verification_history ?? [], [[
                'event' => 'email_verified',
                'timestamp' => now()->toISOString(),
                'ip' => $ip,
                'device' => $device,
                'browser' => $browser,
            ]])),
        ]);
        $this->save();
    }
}
