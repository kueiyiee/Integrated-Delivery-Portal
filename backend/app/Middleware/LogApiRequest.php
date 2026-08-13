<?php

namespace App\Middleware;

use App\Models\ApiRequestLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LogApiRequest
{
    public function handle(Request $request, Closure $next)
    {
        $requestId = $request->header('X-Request-Id') ?? Str::uuid()->toString();
        $request->headers->set('X-Request-Id', $requestId);

        $startTime = microtime(true);
        $response = $next($request);
        $responseTime = (int) round((microtime(true) - $startTime) * 1000);

        // Log asynchronously to avoid blocking the response
        // Don't log request/response bodies to avoid storage overhead
        try {
            ApiRequestLog::create([
                'request_id' => $requestId,
                'api_key_id' => optional($request->attributes->get('api_key'))->id,
                'application_id' => optional($request->attributes->get('api_key'))->application_id,
                'company_id' => optional($request->attributes->get('api_key'))->company_id,
                'endpoint' => $request->path(),
                'method' => $request->method(),
                'status_code' => $response->getStatusCode(),
                'response_time_ms' => $responseTime,
                'ip_address' => $request->ip(),
                'device' => $request->header('User-Agent'),
                'user_agent' => $request->header('User-Agent'),
                'request_headers' => $this->filterHeaders($request->headers->all()),
                'request_body' => null, // Skip to reduce storage
                'response_headers' => $this->filterHeaders($response->headers->all()),
                'response_body' => null, // Skip to reduce storage
            ]);
        } catch (\Throwable $exception) {
            // Log silently to avoid request blocking
            report($exception);
        }

        return $response;
    }

    protected function filterHeaders(array $headers): array
    {
        // Only keep non-sensitive headers and limit size
        $filtered = array_filter(
            $headers,
            fn ($value, $key) => ! in_array(strtolower($key), ['authorization', 'cookie', 'set-cookie'], true),
            ARRAY_FILTER_USE_BOTH
        );
        
        // Truncate large header values
        foreach ($filtered as $key => $value) {
            if (is_array($value)) {
                $filtered[$key] = array_map(fn ($v) => is_string($v) && strlen($v) > 1000 ? substr($v, 0, 1000) . '...' : $v, $value);
            } elseif (is_string($value) && strlen($value) > 1000) {
                $filtered[$key] = substr($value, 0, 1000) . '...';
            }
        }
        
        return $filtered;
    }
}
