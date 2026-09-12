<?php

namespace App\Middleware;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;

class ProtectSystemEntities
{
    /**
     * Handle an incoming request and block modifications to protected system entities.
     */
    public function handle(Request $request, Closure $next)
    {
        $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');

        // Check route bound user
        $targetUser = $request->route('user');
        if ($targetUser instanceof User) {
            if ($this->isProtectedUser($targetUser, $systemEmail)) {
                $this->recordBlockedAttempt($request, 'user', $targetUser->id, $targetUser->email);
                abort(403, 'Operation not allowed on protected system user.');
            }
        }

        // Check route bound company
        $targetCompany = $request->route('company');
        if ($targetCompany instanceof Company) {
            if ($this->isProtectedCompany($targetCompany)) {
                $this->recordBlockedAttempt($request, 'company', $targetCompany->id, $targetCompany->slug ?? $targetCompany->name);
                abort(403, 'Operation not allowed on protected system company.');
            }
        }

        return $next($request);
    }

    protected function isProtectedUser(User $user, string $systemEmail): bool
    {
        if ($user->is_system_owner) return true;
        if (strcasecmp($user->email, $systemEmail) === 0) return true;
        if ($user->company_id === null && $user->hasRole('System Administrator')) return true;
        // check roles flag
        if ($user->roles()->where('is_system', true)->exists()) return true;
        return false;
    }

    protected function isProtectedCompany(Company $company): bool
    {
        return ($company->slug ?? '') === 'system-admin';
    }

    protected function recordBlockedAttempt(Request $request, string $targetType, $targetId, $targetLabel): void
    {
        try {
            AuditLog::create([
                'user_id' => $request->user()?->id ?? null,
                'company_id' => $request->user()?->company_id ?? null,
                'action' => 'blocked_modify_system_entity',
                'metadata' => [
                    'ip' => $request->ip(),
                    'route' => $request->path(),
                    'method' => $request->method(),
                    'target_type' => $targetType,
                    'target_id' => $targetId,
                    'target_label' => $targetLabel,
                ],
            ]);
        } catch (\Throwable $e) {
            // best-effort logging; do not interrupt response beyond the abort
            \Illuminate\Support\Facades\Log::warning('Failed to persist blocked system-entity audit log', ['error' => $e->getMessage()]);
        }
    }
}
