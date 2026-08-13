<?php

namespace App\Controllers;

use App\Models\AuditLog;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController
{
    use AuthorizesRequests;
    use ValidatesRequests;

    protected function recordAudit(Request $request, string $action, array $metadata = []): void
    {
        AuditLog::create([
            'user_id' => optional($request->user())->id,
            'company_id' => optional($request->user())->company_id,
            'action' => $action,
            'metadata' => $metadata,
        ]);
    }
}
