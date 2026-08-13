<?php

namespace App\Services;

use App\Models\ApiKey;
use App\Models\ApiKeyRotation;
use App\Models\DeveloperApplication;
use Illuminate\Contracts\Hashing\Hasher;
use Illuminate\Support\Str;

class ApiKeyManagementService
{
    public function __construct(protected Hasher $hasher)
    {
    }

    public function createApplication(array $data): DeveloperApplication
    {
        $data['uuid'] = Str::uuid()->toString();
        $data['client_id'] = $this->generateClientId();
        $data['environment'] = $data['environment'] ?? 'sandbox';
        $data['status'] = $data['status'] ?? 'pending';

        $data['redirect_urls'] = isset($data['redirect_urls']) ? array_values(array_filter($data['redirect_urls'], fn ($url) => is_string($url) && trim($url) !== '')) : null;
        $data['allowed_ips'] = isset($data['allowed_ips']) ? array_values(array_filter($data['allowed_ips'], fn ($ip) => is_string($ip) && trim($ip) !== '')) : null;

        return DeveloperApplication::create($data);
    }

    public function generateApiKey(DeveloperApplication $application, int $createdBy, array $scopes = [], ?\DateTimeInterface $expiresAt = null): array
    {
        $pair = $this->generateSecureKeyPair($application->environment);

        $apiKey = ApiKey::create([
            'uuid' => Str::uuid()->toString(),
            'application_id' => $application->id,
            'company_id' => $application->company_id,
            'name' => $application->name,
            'description' => $application->description,
            'public_key' => $pair['public'],
            'key_prefix' => $pair['keyPrefix'],
            'secret_hash' => $this->hasher->make($pair['secret']),
            'signing_key_hash' => $this->hasher->make($pair['signingKey']),
            'environment' => $application->environment,
            'scopes' => array_values(array_filter($scopes, fn ($scope) => is_string($scope) && trim($scope) !== '')),
            'metadata' => [
                'created_from' => 'developer_portal',
                'redirect_urls' => $application->redirect_urls,
                'allowed_ips' => $application->allowed_ips,
            ],
            'expires_at' => $expiresAt?->format('Y-m-d H:i:s'),
            'status' => 'active',
            'created_by' => $createdBy,
        ]);

        return [
            'api_key' => $apiKey,
            'client_secret' => $pair['secret'],
            'signing_key' => $pair['signingKey'],
        ];
    }

    public function rotateApiKey(ApiKey $apiKey, int $rotatedBy, string $reason): string
    {
        $oldPublicKey = $apiKey->public_key;
        $pair = $this->generateSecureKeyPair($apiKey->environment);

        $apiKey->update([
            'public_key' => $pair['public'],
            'key_prefix' => $pair['keyPrefix'],
            'secret_hash' => $this->hasher->make($pair['secret']),
            'signing_key_hash' => $this->hasher->make($pair['signingKey']),
            'status' => 'active',
        ]);

        ApiKeyRotation::create([
            'api_key_id' => $apiKey->id,
            'old_key_id' => $oldPublicKey,
            'new_key_id' => $pair['public'],
            'rotation_reason' => $reason,
            'rotated_by' => $rotatedBy,
        ]);

        return $pair['secret'];
    }

    public function revokeApiKey(ApiKey $apiKey, int $revokedBy): void
    {
        $apiKey->update(['status' => 'revoked']);
        ApiKeyRotation::create([
            'api_key_id' => $apiKey->id,
            'old_key_id' => $apiKey->key_id,
            'rotation_reason' => 'revoked',
            'rotated_by' => $revokedBy,
        ]);
    }

    protected function generateClientId(): string
    {
        return 'app_' . Str::lower(Str::random(24));
    }

    protected function generateSecureKeyPair(string $environment): array
    {
        $prefix = $environment === 'production' ? 'pk_live_' : 'pk_test_';
        $keyId = $prefix . Str::random(30);
        $secret = $environment === 'production' ? 'sk_live_' . Str::random(64) : 'sk_test_' . Str::random(64);
        $signingKey = Str::random(64);

        return [
            'keyId' => $keyId,
            'secret' => $secret,
            'keyPrefix' => $prefix,
            'signingKey' => $signingKey,
        ];
    }
}
