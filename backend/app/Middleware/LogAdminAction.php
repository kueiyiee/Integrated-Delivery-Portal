<?php

namespace App\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LogAdminAction
{
    /**
     * Handle an incoming request and write an audit log for mutating actions.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        try {
            if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
                $user = $request->user();

                $payload = $request->except([
                    'password',
                    'password_confirmation',
                    'secret',
                    'token',
                    'api_key',
                    'current_password',
                    'new_password',
                    'new_password_confirmation',
                ]);

                DB::table('audit_logs')->insert([
                    'user_id' => $user ? $user->id : null,
                    'company_id' => $user ? $user->company_id : null,
                    'action' => sprintf('%s %s', $request->method(), $request->path()),
                    'metadata' => json_encode($payload),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to write audit log: ' . $e->getMessage());
        }

        return $response;
    }
}
