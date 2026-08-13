<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Traits\ConditionalSoftDeletes;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ApiKey extends Model
{
    use HasFactory, ConditionalSoftDeletes;

    protected $fillable = [
        'uuid',
        'application_id',
        'company_id',
        'name',
        'description',
        'public_key',
        'key',
        'key_prefix',
        'secret_hash',
        'secret_fingerprint',
        'signing_key_hash',
        'environment',
        'permissions',
        'scopes',
        'metadata',
        'last_used_at',
        'expires_at',
        'status',
        'created_by',
        'revoked_at',
    ];

    protected $hidden = [
        'secret_hash',
        'signing_key_hash',
    ];

    protected $casts = [
        'permissions' => 'array',
        'scopes' => 'array',
        'metadata' => 'array',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public static function generateKeyPair(string $environment = 'production') : array
    {
        $prefixPublic = $environment === 'production' ? 'pk_live_' : 'pk_test_';
        $prefixSecret = $environment === 'production' ? 'sk_live_' : 'sk_test_';

        $public = $prefixPublic . strtoupper(Str::random(10));
        $secret = $prefixSecret . Str::random(40);

        return ['public' => $public, 'secret' => $secret, 'key_prefix' => $prefixPublic];
    }

    public function verifySecret(string $secret): bool
    {
        return Hash::check($secret, $this->secret_hash);
    }

    public function getPublicKeyAttribute(?string $value): ?string
    {
        return $value ?? $this->attributes['key'] ?? null;
    }

    public function setPublicKeyAttribute(?string $value): void
    {
        if ($value === null) {
            return;
        }

        if (Schema::hasColumn('api_keys', 'public_key')) {
            $this->attributes['public_key'] = $value;
        } else {
            $this->attributes['key'] = $value;
        }
    }

    public function getKeyPrefixAttribute(?string $value): ?string
    {
        if ($value !== null) {
            return $value;
        }

        $key = $this->attributes['key'] ?? null;
        if (! is_string($key)) {
            return null;
        }

        return preg_match('/^pk_(live|test)_/i', $key) ? substr($key, 0, 8) : null;
    }

    public function getSecretHashAttribute(?string $value): ?string
    {
        return $value ?? $this->attributes['secret_fingerprint'] ?? null;
    }

    public function setSecretHashAttribute(?string $value): void
    {
        if ($value === null) {
            return;
        }

        if (Schema::hasColumn('api_keys', 'secret_hash')) {
            $this->attributes['secret_hash'] = $value;
        } else {
            $this->attributes['secret_fingerprint'] = $value;
        }
    }

    public static function findByPublicKey(string $publicKey)
    {
        if (Schema::hasColumn('api_keys', 'public_key')) {
            return static::where('public_key', $publicKey)->first();
        }

        return static::where('key', $publicKey)->first();
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
