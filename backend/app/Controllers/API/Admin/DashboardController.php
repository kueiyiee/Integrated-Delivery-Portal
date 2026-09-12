<?php

namespace App\Controllers\API\Admin;

use App\Controllers\Controller;
use App\Models\ApiKey;
use App\Models\ApiRequestLog;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Driver;
use App\Models\LoginHistory;
use App\Models\ReportExport;
use App\Models\User;
use App\Models\UserSession;
use App\Models\WebhookEndpoint;
use App\Models\WebhookEndpointLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $metrics = Cache::remember('admin:dashboard:metrics', 15, function () {
            $today = Carbon::today();
            $weekStart = Carbon::today()->subDays(6);
            $monthStart = Carbon::today()->subDays(29);
            $lastWeek = Carbon::today()->subDays(7);
            $lastMonth = Carbon::today()->subDays(30);
            $previousWeekStart = Carbon::today()->subDays(14);
            $previousMonthStart = Carbon::today()->subDays(60);
            $pendingStatuses = [
                Company::STATUS_PENDING,
                Company::STATUS_PENDING_APPROVAL,
                Company::STATUS_PENDING_EMAIL_VERIFICATION,
                Company::STATUS_UNDER_REVIEW,
            ];

            $totalCompanies = Company::count();
            $todayRegistrations = Company::whereDate('created_at', $today)->count();
            $weeklyRegistrations = Company::where('created_at', '>=', $weekStart)->count();
            $monthlyRegistrations = Company::where('created_at', '>=', $monthStart)->count();

            $previousWeekRegistrations = Company::where('created_at', '>=', $previousWeekStart)
                ->where('created_at', '<', $lastWeek)
                ->count();
            $previousMonthRegistrations = Company::where('created_at', '>=', $previousMonthStart)
                ->where('created_at', '<', $lastMonth)
                ->count();

            $pendingApprovals = Company::whereIn('status', $pendingStatuses)->count();
            $highPriorityApprovals = 0;
            if (Schema::hasColumn('companies', 'risk_level')) {
                $highPriorityApprovals = Company::whereIn('status', $pendingStatuses)
                    ->where('risk_level', 'high')
                    ->count();
            }

            $hasApprovedAtColumn = Schema::hasColumn('companies', 'approved_at');
            $approvedCompanies = $hasApprovedAtColumn ? Company::whereNotNull('approved_at')->count() : 0;
            $activeCompanies = Company::where('status', Company::STATUS_ACTIVE)->count();
            $suspendedCompanies = Company::where('status', Company::STATUS_SUSPENDED)->count();
            $recentApprovals = $hasApprovedAtColumn
                ? Company::whereNotNull('approved_at')->where('approved_at', '>=', now()->subDay())->count()
                : 0;
            $avgApprovalTimeSeconds = 0;
            $approvalsWithinSla = 0;
            $totalApproved = 0;
            $approvalSla = 0;

            if ($hasApprovedAtColumn) {
                $avgApprovalTimeSeconds = Company::whereNotNull('approved_at')
                    ->selectRaw('avg(TIMESTAMPDIFF(SECOND, created_at, approved_at)) as avg_seconds')
                    ->value('avg_seconds') ?? 0;
                $approvalsWithinSla = Company::whereNotNull('approved_at')
                    ->whereRaw('approved_at <= created_at + INTERVAL 48 HOUR')
                    ->count();
                $totalApproved = Company::whereNotNull('approved_at')->count();
                $approvalSla = $totalApproved === 0 ? 0 : round(($approvalsWithinSla / $totalApproved) * 100, 1);
            }
            $avgApprovalTimeMinutes = round($avgApprovalTimeSeconds / 60, 1);

            $activeSessions = UserSession::where('revoked', false)
                ->where('last_activity', '>=', now()->subMinutes(15))
                ->count();

            $systemAdministratorsOnline = DB::table('user_sessions')
                ->join('users', 'users.id', '=', 'user_sessions.user_id')
                ->where('user_sessions.revoked', false)
                ->where('user_sessions.last_activity', '>=', now()->subMinutes(15))
                ->where(function ($query) {
                    $query->where('users.is_system_owner', true)
                        ->orWhereExists(function ($subquery) {
                            $subquery->select(DB::raw(1))
                                ->from('role_user')
                                ->join('roles', 'roles.id', '=', 'role_user.role_id')
                                ->whereColumn('role_user.user_id', 'users.id')
                                ->where('roles.name', 'System Administrator');
                        });
                })
                ->distinct('user_sessions.user_id')
                ->count('user_sessions.id');

            $companyManagersOnline = DB::table('user_sessions')
                ->join('users', 'users.id', '=', 'user_sessions.user_id')
                ->where('user_sessions.revoked', false)
                ->where('user_sessions.last_activity', '>=', now()->subMinutes(15))
                ->whereNotNull('users.company_id')
                ->where('users.is_system_owner', false)
                ->distinct('user_sessions.user_id')
                ->count('user_sessions.id');

            $apiKeyBaseQuery = DB::table('api_keys');
            if (Schema::hasColumn('api_keys', 'deleted_at')) {
                $apiKeyBaseQuery = $apiKeyBaseQuery->whereNull('deleted_at');
            }

            $apiKeysTotal = (clone $apiKeyBaseQuery)->count();
            $apiKeysActive = (clone $apiKeyBaseQuery)->where('status', 'active')->count();
            $apiKeysRevoked = (clone $apiKeyBaseQuery)->where('status', 'revoked')->count();
            $apiKeysExpired = (clone $apiKeyBaseQuery)->whereNotNull('expires_at')
                ->where('expires_at', '<', now())
                ->count();
            $recentApiKeys = (clone $apiKeyBaseQuery)->where('created_at', '>=', now()->subDays(7))->count();

            $webhookEndpointBaseQuery = DB::table('webhook_endpoints');
            if (Schema::hasColumn('webhook_endpoints', 'deleted_at')) {
                $webhookEndpointBaseQuery = $webhookEndpointBaseQuery->whereNull('deleted_at');
            }

            $activeWebhooks = (clone $webhookEndpointBaseQuery)->where('status', 'active')->count();
            $webhookFailedDeliveries = 0;
            $webhookSuccessDeliveries = 0;
            $webhookAttempts = 0;
            $webhookSuccessRate = 0;
            $lastWebhookEventAt = null;
            if (Schema::hasTable('webhook_endpoint_logs')) {
                $webhookFailedDeliveries = WebhookEndpointLog::whereIn('status', ['failed', 'error'])->count();
                $webhookSuccessDeliveries = WebhookEndpointLog::where('status', 'delivered')->count();
                $webhookAttempts = WebhookEndpointLog::count();
                $webhookSuccessRate = $webhookAttempts === 0 ? 0 : round(($webhookSuccessDeliveries / $webhookAttempts) * 100, 1);
                $lastWebhookEventAtRaw = WebhookEndpointLog::orderByDesc('created_at')->value('created_at');
                $lastWebhookEventAt = $lastWebhookEventAtRaw ? Carbon::parse($lastWebhookEventAtRaw) : null;
            }
            $lastLoginActivityRaw = LoginHistory::orderByDesc('occurred_at')->value('occurred_at');
            $lastLoginActivity = $lastLoginActivityRaw ? Carbon::parse($lastLoginActivityRaw) : null;

            $apiRequests24h = 0;
            $apiErrors24h = 0;
            $avgResponseTimeMs24h = 0;
            if (Schema::hasTable('api_request_logs')) {
                $apiRequests24h = ApiRequestLog::where('created_at', '>=', now()->subDay())->count();
                $apiErrors24h = ApiRequestLog::where('created_at', '>=', now()->subDay())
                    ->where('status_code', '>=', 400)
                    ->count();
                $avgResponseTimeMs24h = (int) ApiRequestLog::where('created_at', '>=', now()->subDay())
                    ->whereNotNull('response_time_ms')
                    ->avg('response_time_ms');
            }
            $webhookAttempts7d = 0;
            $webhookSuccessDeliveries7d = 0;
            $webhookSuccessRate7d = 0;
            if (Schema::hasTable('webhook_endpoint_logs')) {
                $webhookAttempts7d = WebhookEndpointLog::where('created_at', '>=', now()->subDays(7))->count();
                $webhookSuccessDeliveries7d = WebhookEndpointLog::where('created_at', '>=', now()->subDays(7))
                    ->where('status', 'delivered')
                    ->count();
                $webhookSuccessRate7d = $webhookAttempts7d === 0 ? 0 : round(($webhookSuccessDeliveries7d / $webhookAttempts7d) * 100, 1);
            }
            $auditEvents7d = 0;
            $reportExports7d = 0;
            if (Schema::hasTable('audit_logs')) {
                $auditEvents7d = AuditLog::where('created_at', '>=', now()->subDays(7))->count();
            }
            if (Schema::hasTable('report_exports')) {
                $reportExports7d = ReportExport::where('created_at', '>=', now()->subDays(7))->count();
            }

            return [
                'registered_companies_total' => $totalCompanies,
                'today_registrations' => $todayRegistrations,
                'weekly_registrations' => $weeklyRegistrations,
                'monthly_registrations' => $monthlyRegistrations,
                'weekly_registration_growth' => $previousWeekRegistrations === 0 ? ($weeklyRegistrations === 0 ? 0 : 100) : round((($weeklyRegistrations - $previousWeekRegistrations) / max(1, $previousWeekRegistrations)) * 100, 1),
                'monthly_registration_growth' => $previousMonthRegistrations === 0 ? ($monthlyRegistrations === 0 ? 0 : 100) : round((($monthlyRegistrations - $previousMonthRegistrations) / max(1, $previousMonthRegistrations)) * 100, 1),
                'pending_approvals' => $pendingApprovals,
                'high_priority_approvals' => $highPriorityApprovals,
                'average_approval_time_minutes' => $avgApprovalTimeMinutes,
                'approval_sla_percent' => $approvalSla,
                'approved_companies' => $approvedCompanies,
                'active_companies' => $activeCompanies,
                'suspended_companies' => $suspendedCompanies,
                'recent_approvals_last_24h' => $recentApprovals,
                'current_active_sessions' => $activeSessions,
                'system_admins_online' => $systemAdministratorsOnline,
                'company_managers_online' => $companyManagersOnline,
                'last_login_activity' => $lastLoginActivity?->toISOString(),
                'api_keys_total' => $apiKeysTotal,
                'api_keys_active' => $apiKeysActive,
                'api_keys_revoked' => $apiKeysRevoked,
                'api_keys_expired' => $apiKeysExpired,
                'recent_api_keys_last_7d' => $recentApiKeys,
                'webhook_endpoints_active' => $activeWebhooks,
                'webhook_failed_deliveries' => $webhookFailedDeliveries,
                'webhook_success_rate' => $webhookSuccessRate,
                'webhook_success_rate_7d' => $webhookSuccessRate7d,
                'api_requests_24h' => $apiRequests24h,
                'api_errors_24h' => $apiErrors24h,
                'avg_response_time_ms_24h' => $avgResponseTimeMs24h,
                'audit_events_7d' => $auditEvents7d,
                'report_exports_7d' => $reportExports7d,
                'last_webhook_event_at' => $lastWebhookEventAt?->toISOString(),
                'last_updated' => now()->toISOString(),
            ];
        });

        return response()->json(['metrics' => $metrics]);
    }

    public function security(Request $request): JsonResponse
    {
        $user = $request->user();
        $companyId = $user->company_id;
        $cacheKey = $companyId === null ? 'admin:security:metrics:global' : "admin:security:metrics:{$companyId}";

        $metrics = Cache::remember($cacheKey, 15, function () use ($companyId) {
            $auditQuery = AuditLog::query();
            $apiKeyQuery = DB::table('api_keys');
            $webhookQuery = DB::table('webhook_endpoints');

            if ($companyId !== null) {
                $auditQuery->where('company_id', $companyId);
                $apiKeyQuery->where('company_id', $companyId);
                $webhookQuery->where('company_id', $companyId);
            }

            if (Schema::hasColumn('api_keys', 'deleted_at')) {
                $apiKeyQuery->whereNull('deleted_at');
            }

            if (Schema::hasColumn('webhook_endpoints', 'deleted_at')) {
                $webhookQuery->whereNull('deleted_at');
            }

            return [
                'audit_events' => $auditQuery->count(),
                'active_api_keys' => $apiKeyQuery->where('status', 'active')->count(),
                'recent_webhooks' => $webhookQuery->where('created_at', '>=', now()->subDays(7))->count(),
            ];
        });

        return response()->json(['metrics' => $metrics]);
    }

    public function analytics(Request $request): JsonResponse
    {
        $period = (int) $request->query('period', 14);
        if (! in_array($period, [7, 14, 30], true)) {
            $period = 14;
        }

        $cacheKey = "admin:dashboard:analytics:{$period}";

        $result = Cache::remember($cacheKey, 60, function () use ($period) {
            $periodStart = Carbon::today()->subDays($period - 1);

            // Determine whether the analytics tables exist. If none exist, return an empty series and flag has_analytics=false
            $hasRequestLogs = Schema::hasTable('api_request_logs');
            $hasAuditLogs = Schema::hasTable('audit_logs');
            $hasCompanies = Schema::hasTable('companies');

            if (! $hasRequestLogs && ! $hasAuditLogs && ! $hasCompanies) {
                // No analytics tables available
                return ['has_analytics' => false, 'series' => []];
            }

            $dailySeries = [];
            foreach (range(0, $period - 1) as $offset) {
                $date = $periodStart->copy()->addDays($offset);

                $dailySeries[$date->toDateString()] = [
                    'day' => $date->format('M j'),
                    'requests' => 0,
                    'errors' => 0,
                    'registrations' => 0,
                    'approvals' => 0,
                    'events' => 0,
                ];
            }

            if ($hasRequestLogs) {
                $requestRows = ApiRequestLog::selectRaw('DATE(created_at) as date, count(*) as requests, sum(case when status_code >= 400 then 1 else 0 end) as errors')
                    ->where('created_at', '>=', $periodStart)
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get();

                foreach ($requestRows as $row) {
                    if (isset($dailySeries[$row->date])) {
                        $dailySeries[$row->date]['requests'] = (int) $row->requests;
                        $dailySeries[$row->date]['errors'] = (int) $row->errors;
                    }
                }
            }

            if ($hasCompanies) {
                $registrationRows = Company::selectRaw('DATE(created_at) as date, count(*) as registrations')
                    ->where('created_at', '>=', $periodStart)
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get();

                foreach ($registrationRows as $row) {
                    if (isset($dailySeries[$row->date])) {
                        $dailySeries[$row->date]['registrations'] = (int) $row->registrations;
                    }
                }

                if (Schema::hasColumn('companies', 'approved_at')) {
                    $approvalRows = Company::selectRaw('DATE(approved_at) as date, count(*) as approvals')
                        ->whereNotNull('approved_at')
                        ->where('approved_at', '>=', $periodStart)
                        ->groupBy('date')
                        ->orderBy('date')
                        ->get();

                    foreach ($approvalRows as $row) {
                        if (isset($dailySeries[$row->date])) {
                            $dailySeries[$row->date]['approvals'] = (int) $row->approvals;
                        }
                    }
                }
            }

            if ($hasAuditLogs) {
                $auditRows = AuditLog::selectRaw('DATE(created_at) as date, count(*) as events')
                    ->where('created_at', '>=', $periodStart)
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get();

                foreach ($auditRows as $row) {
                    if (isset($dailySeries[$row->date])) {
                        $dailySeries[$row->date]['events'] = (int) $row->events;
                    }
                }
            }

            return ['has_analytics' => true, 'series' => array_values($dailySeries)];
        });

        return response()->json(['metrics' => $result['series'] ?? [], 'has_analytics' => $result['has_analytics'] ?? false]);
    }
}
