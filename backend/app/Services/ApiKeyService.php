<?php

namespace App\Services;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class ApiKeyService
{
    public function create(?int $companyId, int $createdBy, string $name, ?string $description, array $permissions = [], string $environment = 'production', ?\DateTimeInterface $expiresAt = null): array
    {
        $pair = ApiKey::generateKeyPair($environment);

        $secretHash = Hash::make($pair['secret']);
        $permissions = array_values(array_filter($permissions, fn ($permission) => is_string($permission) && trim($permission) !== ''));

        $attributes = [
            'company_id' => $companyId,
            'name' => $name,
            'expires_at' => $expiresAt ? $expiresAt->format('Y-m-d H:i:s') : null,
            'status' => 'active',
        ];

        if (Schema::hasColumn('api_keys', 'description')) {
            $attributes['description'] = $description;
        }

        if (Schema::hasColumn('api_keys', 'public_key')) {
            $attributes['public_key'] = $pair['public'];
        } elseif (Schema::hasColumn('api_keys', 'key')) {
            $attributes['key'] = $pair['public'];
        }

        if (Schema::hasColumn('api_keys', 'key_prefix')) {
            $attributes['key_prefix'] = $pair['key_prefix'];
        }

        if (Schema::hasColumn('api_keys', 'secret_hash')) {
            $attributes['secret_hash'] = $secretHash;
        } elseif (Schema::hasColumn('api_keys', 'secret_fingerprint')) {
            $attributes['secret_fingerprint'] = $secretHash;
        }

        if (Schema::hasColumn('api_keys', 'environment')) {
            $attributes['environment'] = $environment;
        }

        if (Schema::hasColumn('api_keys', 'permissions')) {
            $attributes['permissions'] = $permissions;
        }

        if (Schema::hasColumn('api_keys', 'created_by')) {
            $attributes['created_by'] = $createdBy;
        }

        if (! isset($attributes['status']) && Schema::hasColumn('api_keys', 'status')) {
            $attributes['status'] = 'active';
        }

        $apiKey = ApiKey::create($attributes);

        return ['api_key' => $apiKey, 'secret' => $pair['secret']];
    }

    public function revoke(ApiKey $apiKey, int $byUserId): void
    {
        $apiKey->status = 'revoked';
        $apiKey->revoked_at = now();
        $apiKey->save();
    }

    public function regenerate(ApiKey $apiKey): string
    {
        $pair = ApiKey::generateKeyPair($apiKey->environment);
        $apiKey->public_key = $pair['public'];
        $apiKey->key_prefix = $pair['key_prefix'];
        $apiKey->secret_hash = Hash::make($pair['secret']);
        $apiKey->save();

        return $pair['secret'];
    }
}
