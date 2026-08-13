<?php

namespace App\Controllers\API\Client;

use App\Controllers\Controller;
use App\Models\ApiKey;
use App\Models\ApiRequestLog;
use App\Models\WebhookEndpoint;
use App\Services\ApiKeyService;
use App\Services\Webhook\WebhookValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class ApiManagementController extends Controller
{
    public function __construct(private ApiKeyService $apiKeyService)
    {
    }

    public function apiKeys(Request $request): JsonResponse
    {
        $user = Auth::user();
        $perPage = max(1, min(100, (int) $request->query('per_page', 20)));

        $query = ApiKey::query()
            ->where('company_id', $user->company_id)
            ->orderByDesc('created_at');

        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'total' => $page->total(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    private function ensureCompanyApproved(): void
    {
        $user = Auth::user();
        $company = $user?->company ?? ($user?->company_id ? \App\Models\Company::find($user->company_id) : null);

        if (! $company || ! $company->isAdminVerified()) {
            abort(403, 'API key generation and management is disabled until your company account is approved by a system administrator.');
        }
    }

    public function createApiKey(Request $request): JsonResponse
    {
        $this->ensureCompanyApproved();
        $user = Auth::user();
        $this->validate($request, [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'environment' => ['nullable', 'string', 'in:production,test'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'max:255'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        $result = $this->apiKeyService->create(
            $user->company_id,
            $user->id,
            $request->input('name'),
            $request->input('description'),
            $request->input('permissions', []),
            $request->input('environment', 'production'),
            $request->input('expires_at') ? \Carbon\Carbon::parse($request->input('expires_at')) : null,
        );

        $this->recordAudit($request, 'api_key.created', [
            'company_id' => $user->company_id,
            'created_by' => $user->id,
            'name' => $request->input('name'),
            'environment' => $request->input('environment', 'production'),
            'expires_at' => $request->input('expires_at'),
        ]);

        return response()->json(['data' => [
            'api_key' => $result['api_key'],
            'secret' => $result['secret'],
        ]], 201);
    }

    public function revokeApiKey(Request $request, ApiKey $apiKey): JsonResponse
    {
        $user = Auth::user();
        if ($apiKey->company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->apiKeyService->revoke($apiKey, $user->id);

        $this->recordAudit($request, 'api_key.revoked', [
            'company_id' => $user->company_id,
            'api_key_id' => $apiKey->id,
            'revoked_by' => $user->id,
        ]);

        return response()->json(['data' => $apiKey->fresh()]);
    }

    public function regenerateApiKey(Request $request, ApiKey $apiKey): JsonResponse
    {
        $user = Auth::user();
        if ($apiKey->company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $secret = $this->apiKeyService->regenerate($apiKey);

        $this->recordAudit($request, 'api_key.regenerated', [
            'company_id' => $user->company_id,
            'api_key_id' => $apiKey->id,
            'regenerated_by' => $user->id,
        ]);

        return response()->json(['data' => [
            'api_key' => $apiKey->fresh(),
            'secret' => $secret,
        ]]);
    }

    public function deleteApiKey(Request $request, ApiKey $apiKey): JsonResponse
    {
        $user = Auth::user();
        if ($apiKey->company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $apiKey->delete();

        $this->recordAudit($request, 'api_key.deleted', [
            'company_id' => $user->company_id,
            'api_key_id' => $apiKey->id,
            'deleted_by' => $user->id,
        ]);

        return response()->json([], 204);
    }

    public function webhooks(Request $request): JsonResponse
    {
        $user = Auth::user();
        $perPage = max(1, min(100, (int) $request->query('per_page', 20)));

        $query = WebhookEndpoint::query()
            ->where('company_id', $user->company_id)
            ->orderByDesc('created_at');

        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'total' => $page->total(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function webhookHistory(Request $request, WebhookEndpoint $webhook): JsonResponse
    {
        $user = Auth::user();
        if ($webhook->company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $perPage = max(1, min(100, (int) $request->query('per_page', 25)));
        $query = \App\Models\WebhookEndpointLog::query()->where('webhook_endpoint_id', $webhook->id)->orderByDesc('created_at');
        $page = $query->paginate($perPage);

        return response()->json(['data' => $page->items(), 'meta' => ['total' => $page->total(), 'per_page' => $page->perPage(), 'current_page' => $page->currentPage()]]);
    }

    public function createWebhook(Request $request, WebhookValidator $validator): JsonResponse
    {
        $this->ensureCompanyApproved();
        $user = Auth::user();
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'target_url' => ['required', 'url', 'max:2048'],
            'http_method' => ['nullable', 'string', 'in:POST,PUT,PATCH,GET'],
            'retry_count' => ['nullable', 'integer', 'min:0', 'max:10'],
            'timeout_seconds' => ['nullable', 'integer', 'min:1', 'max:60'],
            'events' => ['nullable', 'array'],
            'events.*' => ['string', 'max:255'],
        ]);

        $targetUrl = $request->input('target_url');
        $environment = $request->input('environment', 'production');

        try {
            $validator->validateUrl($targetUrl, $environment);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $endpoint = WebhookEndpoint::create([
            'company_id' => $user->company_id,
            'name' => $request->input('name'),
            'description' => $request->input('description'),
            'target_url' => $targetUrl,
            'http_method' => $request->input('http_method', 'POST'),
            'retry_count' => $request->input('retry_count', 3),
            'timeout_seconds' => $request->input('timeout_seconds', 10),
            'events' => $request->input('events', []),
            'status' => 'active',
            'created_by' => $user->id,
            'secret_cipher' => Crypt::encryptString(WebhookEndpoint::generateSecret()),
        ]);

        $this->recordAudit($request, 'webhook.created', [
            'company_id' => $user->company_id,
            'webhook_id' => $endpoint->id,
            'name' => $endpoint->name,
            'target_url' => $endpoint->target_url,
            'http_method' => $endpoint->http_method,
            'events' => $endpoint->events,
        ]);

        return response()->json(['data' => $endpoint], 201);
    }

    public function testWebhook(Request $request, WebhookEndpoint $webhook): JsonResponse
    {
        $this->ensureCompanyApproved();
        $user = Auth::user();
        if ($webhook->company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $payload = [
            'event' => 'delivery.test',
            'company_id' => $user->company_id,
            'message' => 'Company webhook test payload',
            'timestamp' => now()->toIso8601String(),
        ];

        $signature = hash_hmac('sha256', json_encode($payload), $webhook->getSecretPlain() ?? 'test-secret');

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(10)->withHeaders([
                'Content-Type' => 'application/json',
                'X-Webhook-Event' => 'delivery.test',
                'X-Webhook-Signature' => 'sha256=' . $signature,
            ])->post($webhook->target_url, $payload);

            $webhook->last_delivery_at = now();
            $webhook->last_status = $response->ok() ? 'delivered' : 'failed';
            $webhook->last_error = $response->ok() ? null : $response->body();
            $webhook->save();

            $this->recordAudit($request, 'webhook.tested', [
                'company_id' => $user->company_id,
                'webhook_id' => $webhook->id,
                'status' => $response->ok() ? 'delivered' : 'failed',
                'response_code' => $response->status(),
            ]);

            return response()->json(['data' => [
                'ok' => $response->ok(),
                'status' => $response->status(),
                'message' => $response->ok() ? 'Webhook test successful.' : 'Webhook test returned an error response.',
            ]]);
        } catch (\Throwable $exception) {
            $webhook->last_delivery_at = now();
            $webhook->last_status = 'failed';
            $webhook->last_error = $exception->getMessage();
            $webhook->save();

            $this->recordAudit($request, 'webhook.tested', [
                'company_id' => $user->company_id,
                'webhook_id' => $webhook->id,
                'status' => 'failed',
                'error' => $exception->getMessage(),
            ]);

            return response()->json(['message' => 'Webhook test failed.'], 502);
        }
    }

    public function updateWebhook(Request $request, WebhookEndpoint $webhook, WebhookValidator $validator): JsonResponse
    {
        $this->ensureCompanyApproved();
        $user = Auth::user();
        if ($webhook->company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'target_url' => ['nullable', 'url', 'max:2048'],
            'http_method' => ['nullable', 'string', 'in:POST,PUT,PATCH,GET'],
            'retry_count' => ['nullable', 'integer', 'min:0', 'max:10'],
            'timeout_seconds' => ['nullable', 'integer', 'min:1', 'max:60'],
            'events' => ['nullable', 'array'],
            'events.*' => ['string', 'max:255'],
            'environment' => ['nullable', 'string', 'in:production,test,sandbox'],
        ]);

        if ($request->filled('target_url')) {
            try {
                $validator->validateUrl($request->input('target_url'), $request->input('environment', $webhook->environment ?? 'production'));
            } catch (\InvalidArgumentException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            $webhook->target_url = $request->input('target_url');
        }

        foreach (['name','description','http_method','retry_count','timeout_seconds','events','environment'] as $f) {
            if ($request->filled($f)) {
                $webhook->$f = $request->input($f);
            }
        }

        $webhook->save();

        $this->recordAudit($request, 'webhook.updated', [
            'company_id' => $user->company_id,
            'webhook_id' => $webhook->id,
            'changes' => $request->all(),
        ]);

        return response()->json(['data' => $webhook]);
    }

    public function deleteWebhook(Request $request, WebhookEndpoint $webhook): JsonResponse
    {
        $this->ensureCompanyApproved();
        $user = Auth::user();
        if ($webhook->company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $webhook->delete();

        $this->recordAudit($request, 'webhook.deleted', [
            'company_id' => $user->company_id,
            'webhook_id' => $webhook->id,
        ]);

        return response()->json([], 204);
    }

    public function rotateWebhook(Request $request, WebhookEndpoint $webhook): JsonResponse
    {
        $this->ensureCompanyApproved();
        $user = Auth::user();
        if ($webhook->company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Generate new secret and persist encrypted
        $plain = WebhookEndpoint::generateSecret();
        $webhook->secret_cipher = Crypt::encryptString($plain);
        $webhook->save();

        // Audit rotation, do not include secret in audit
        $this->recordAudit($request, 'webhook.secret_rotated', [
            'company_id' => $user->company_id,
            'webhook_id' => $webhook->id,
            'rotated_by' => $user->id,
        ]);

        // Return the secret once to the caller
        return response()->json(['data' => [
            'webhook_id' => $webhook->id,
            'secret' => $plain,
            'message' => 'Webhook secret rotated. This plaintext secret is shown only once. Store it securely.',
        ]]);
    }

    public function documentation(): JsonResponse
    {
        $user = Auth::user();

        return response()->json(['data' => [
            'company_id' => $user->company_id,
            'documentation' => [
                'overview' => 'Use company-scoped API keys and webhooks to connect your delivery workflows securely.',
                'authentication' => 'Send the API key in the Authorization header as Bearer <public_key> or use the secret for signing scenarios.',
                'webhook_signing' => 'Webhooks are signed with an HMAC SHA-256 signature using the endpoint secret.',
                'best_practices' => [
                    'Rotate keys regularly',
                    'Revoke unused keys quickly',
                    'Validate webhook signatures',
                    'Prefer HTTPS endpoints',
                ],
                'endpoints' => [
                    ['method' => 'GET', 'path' => '/v1/client/deliveries', 'description' => 'List deliveries for your company.'],
                    ['method' => 'POST', 'path' => '/v1/client/deliveries', 'description' => 'Create a new delivery.'],
                    ['method' => 'GET', 'path' => '/v1/client/deliveries/{delivery}', 'description' => 'Retrieve a single delivery.'],
                    ['method' => 'PUT', 'path' => '/v1/client/deliveries/{delivery}', 'description' => 'Update a delivery.'],
                    ['method' => 'POST', 'path' => '/v1/client/deliveries/{delivery}/cancel', 'description' => 'Cancel a delivery.'],
                    ['method' => 'POST', 'path' => '/v1/client/deliveries/{delivery}/print-form', 'description' => 'Create a verified delivery print preview and token.'],
                    ['method' => 'GET', 'path' => '/v1/client/deliveries/{delivery}/export', 'description' => 'Download a delivery document as PDF or Word.'],
                    ['method' => 'GET', 'path' => '/v1/client/customers', 'description' => 'List customers for your company.'],
                    ['method' => 'POST', 'path' => '/v1/client/customers', 'description' => 'Create a customer.'],
                ],
                'example_request' => [
                    'curl' => "curl -X GET 'https://api.example.com/v1/client/deliveries' \\\n  -H 'Authorization: Bearer <public_key>' \\\n  -H 'Accept: application/json'",
                ],
                'rate_limits' => 'Requests are throttled per API key. Contact support if you need higher limits.',
            ],
        ]]);
    }

    public function usageStatistics(Request $request): JsonResponse
    {
        $user = Auth::user();
        $companyId = $user->company_id;

        $totalRequests = ApiRequestLog::where('company_id', $companyId)->count();
        $last24h = ApiRequestLog::where('company_id', $companyId)->where('created_at', '>=', now()->subDay())->count();
        $last30d = ApiRequestLog::where('company_id', $companyId)->where('created_at', '>=', now()->subDays(30))->count();
        $healthQuery = ApiRequestLog::where('company_id', $companyId)
            ->where('created_at', '>=', now()->subDay());
        $healthRequests = (clone $healthQuery)->count();
        $healthErrorCount = (clone $healthQuery)->where('status_code', '>=', 400)->count();
        $healthSuccessCount = $healthRequests - $healthErrorCount;
        $avgResponseTime = (float) (clone $healthQuery)->whereNotNull('response_time_ms')->avg('response_time_ms');

        $lastActivity = ApiRequestLog::where('company_id', $companyId)
            ->orderByDesc('created_at')
            ->first();

        $requestsByDay = ApiRequestLog::where('company_id', $companyId)
            ->where('created_at', '>=', now()->subDays(14))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $keyUsage = ApiKey::query()
            ->where('company_id', $companyId)
            ->get()
            ->map(function (ApiKey $key) use ($companyId) {
                return [
                    'id' => $key->id,
                    'name' => $key->name,
                    'public_key' => $key->public_key,
                    'status' => $key->status,
                    'last_used_at' => optional($key->last_used_at)?->toISOString(),
                    'total_requests' => ApiRequestLog::where('company_id', $companyId)
                        ->where('api_key_id', $key->id)
                        ->count(),
                ];
            });

        return response()->json(['data' => [
            'total_requests' => $totalRequests,
            'requests_last_24h' => $last24h,
            'requests_last_30d' => $last30d,
            'error_count' => $healthErrorCount,
            'success_rate' => $healthRequests > 0 ? round(($healthSuccessCount / $healthRequests) * 100, 2) : null,
            'health_window' => 'last_24_hours',
            'health_requests' => $healthRequests,
            'health_success_count' => $healthSuccessCount,
            'health_error_count' => $healthErrorCount,
            'average_response_time_ms' => $avgResponseTime ? round($avgResponseTime, 2) : null,
            'last_activity' => $lastActivity ? [
                'endpoint' => $lastActivity->endpoint,
                'method' => $lastActivity->method,
                'status_code' => $lastActivity->status_code,
                'occurred_at' => optional($lastActivity->created_at)?->toISOString(),
            ] : null,
            'requests_by_day' => $requestsByDay,
            'keys' => $keyUsage,
        ]]);
    }

    public function requestLogs(Request $request): JsonResponse
    {
        $user = Auth::user();
        $perPage = max(1, min(100, (int) $request->query('per_page', 25)));

        $query = ApiRequestLog::query()
            ->where('company_id', $user->company_id)
            ->orderByDesc('created_at');

        if ($request->filled('api_key_id')) {
            $query->where('api_key_id', $request->query('api_key_id'));
        }

        if ($request->filled('method')) {
            $query->where('method', strtoupper((string) $request->query('method')));
        }

        if ($request->filled('status')) {
            $query->where('status_code', (int) $request->query('status'));
        }

        $page = $query->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn (ApiRequestLog $log) => [
                'id' => $log->id,
                'request_id' => $log->request_id,
                'api_key_id' => $log->api_key_id,
                'endpoint' => $log->endpoint,
                'method' => $log->method,
                'status_code' => $log->status_code,
                'response_time_ms' => $log->response_time_ms,
                'ip_address' => $log->ip_address,
                'created_at' => optional($log->created_at)?->toISOString(),
            ]),
            'meta' => [
                'total' => $page->total(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }
}
