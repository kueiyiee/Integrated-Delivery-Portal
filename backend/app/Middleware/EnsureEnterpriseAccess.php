<?php

namespace App\Middleware;

use App\Enums\RoleName;
use Closure;
use Illuminate\Http\Request;

class EnsureEnterpriseAccess
{
    public function handle(Request $request, Closure $next): mixed
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        if ($user->is_system_owner || $user->hasRole(RoleName::SYSTEM_ADMINISTRATOR->value)) {
            return $next($request);
        }

        if ($user->hasRole(RoleName::COMPANY_MANAGER->value) && $request->route('company')) {
            $company = $request->route('company');
            if ($company && $user->company_id === $company->id) {
                return $next($request);
            }
        }

        if ($user->hasRole(RoleName::COMPANY_DISPATCHER->value)) {
            return $next($request);
        }

        abort(403, 'Forbidden');
    }
}
