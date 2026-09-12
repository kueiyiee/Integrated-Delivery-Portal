<?php

namespace App\Middleware;

use App\Enums\RoleName;
use Closure;
use Illuminate\Http\Request;

class EnsureRoleHierarchy
{
    public function handle(Request $request, Closure $next, string $requiredRole): mixed
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        $allowed = match ($requiredRole) {
            'system' => $user->is_system_owner || $user->hasRole(RoleName::SYSTEM_ADMINISTRATOR->value),
            'manager' => $user->hasRole(RoleName::COMPANY_MANAGER->value) || $user->is_system_owner || $user->hasRole(RoleName::SYSTEM_ADMINISTRATOR->value),
            'dispatcher' => $user->hasRole(RoleName::COMPANY_DISPATCHER->value) || $user->hasRole(RoleName::COMPANY_MANAGER->value) || $user->is_system_owner || $user->hasRole(RoleName::SYSTEM_ADMINISTRATOR->value),
            default => false,
        };

        if (! $allowed) {
            abort(403, 'Forbidden by role hierarchy');
        }

        return $next($request);
    }
}
