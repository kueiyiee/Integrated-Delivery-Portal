<?php

namespace App\Controllers\API\Admin;

use App\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()->with('user')->orderBy('created_at', 'desc');

        $requestedCompanyId = $request->query('company_id');
        $user = $request->user();

        $isSystemAdmin = $user->is_system_owner || $user->hasRole('System Administrator') || $user->can('view.audit_logs');

        if ($requestedCompanyId) {
            if ($isSystemAdmin) {
                $query->where('company_id', $requestedCompanyId);
            } else {
                $query->where('company_id', $user->company_id);
            }
        } else {
            if (! $isSystemAdmin) {
                $query->where('company_id', $user->company_id);
            }
        }

        $logs = $query->limit(50)->get();

        return response()->json(['data' => $logs]);
    }
}
