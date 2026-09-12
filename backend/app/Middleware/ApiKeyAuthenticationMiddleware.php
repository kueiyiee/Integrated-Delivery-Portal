<?php

namespace App\Middleware;

use App\Models\ApiKey;
use App\Models\ApiKeyLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ApiKeyAuthenticationMiddleware
{
    public function handle(Request $request, Closure $next, $permission = null)
    {
        $header = $request->header('Authorization');
        if (! $header || ! str_starts_with($header, 'Bearer ')) {
            return response()->json(['message' => 'API key required'], 401);
        }

        $token = substr($header, 7);
        // Expect format: {public}.{secret}
        if (! str_contains($token, '.')) {
            return response()->json(['message' => 'Invalid API key format'], 401);
        }

        [$public, $secret] = explode('.', $token, 2);

        $apiKey = ApiKey::findByPublicKey($public);
        if (! $apiKey) {
            $this->logAttempt(null, $request, 401);
            return response()->json(['message' => 'Invalid API key'], 401);
        }

        if ($apiKey->status !== 'active') {
            $this->logAttempt($apiKey->id, $request, 403);
            return response()->json(['message' => 'API key revoked'], 403);
        }

        if ($apiKey->expires_at && now()->gt($apiKey->expires_at)) {
            $this->logAttempt($apiKey->id, $request, 403);
            return response()->json(['message' => 'API key expired'], 403);
        }

        if (! $apiKey->verifySecret($secret)) {
            $this->logAttempt($apiKey->id, $request, 401);
            return response()->json(['message' => 'Invalid API key credentials'], 401);
        }

        // Permission scope check
        if ($permission) {
            $perms = $apiKey->permissions ?? [];
            if (! in_array($permission, $perms, true)) {
                $this->logAttempt($apiKey->id, $request, 403);
                return response()->json(['message' => 'Insufficient API key permissions'], 403);
            }
        }

        // basic rate limiting per api key
        $limit = Config::get('api.rate_limit', 300);
        $cacheKey = "api_key_rl_{$apiKey->id}_" . $request->ip();
        $count = Cache::add($cacheKey, 0, 60) ? 0 : Cache::increment($cacheKey);
        if ($count > $limit) {
            $this->logAttempt($apiKey->id, $request, 429);
            return response()->json(['message' => 'Rate limit exceeded'], 429);
        }

        // attach api key to request
        $request->attributes->set('api_key', $apiKey);

        // Next, call and log response
        $start = microtime(true);
        $response = $next($request);
        $duration = microtime(true) - $start;

        $this->logAttempt($apiKey->id, $request, $response->getStatusCode(), $duration);

        // update last used
        $apiKey->last_used_at = now();
        $apiKey->saveQuietly();

        return $response;
    }

    protected function logAttempt($apiKeyId, Request $request, int $status = 0, float $duration = null): void
    {
        try {
            ApiKeyLog::create([
                'api_key_id' => $apiKeyId,
                'company_id' => $apiKeyId ? optional(ApiKey::find($apiKeyId))->company_id : null,
                'endpoint' => $request->path(),
                'method' => $request->method(),
                'ip_address' => $request->ip(),
                'user_agent' => $request->header('User-Agent'),
                'response_status' => $status,
                'request_time' => $duration,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to write API key log', ['error' => $e->getMessage()]);
        }
    }
}
