<?php

namespace App\Controllers\API\Admin;

use App\Controllers\Controller;
use App\Models\ApiKey;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Driver;
use App\Models\LoginHistory;
use App\Models\User;
use App\Models\WebhookEndpoint;
use App\Services\ReportDocumentGenerator;
use App\Services\ReportExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ReportsController extends Controller
{
    private const REPORTS = [
        ['id' => 1, 'title' => 'Companies', 'category' => 'companies', 'description' => 'Tenant company profile and status data.'],
        ['id' => 2, 'title' => 'Company Managers', 'category' => 'company_managers', 'description' => 'Managers assigned to tenant companies.'],
        ['id' => 3, 'title' => 'Company Dispatchers', 'category' => 'company_dispatchers', 'description' => 'Dispatch team members and operational contacts.'],
        ['id' => 4, 'title' => 'Users', 'category' => 'users', 'description' => 'Active platform users and account status.'],
        ['id' => 5, 'title' => 'Drivers', 'category' => 'drivers', 'description' => 'Driver records and vehicle assignments.'],
        ['id' => 6, 'title' => 'Deliveries', 'category' => 'deliveries', 'description' => 'Shipment deliveries and workflow status.'],
        ['id' => 7, 'title' => 'Customers', 'category' => 'customers', 'description' => 'Customer directory and contact details.'],
        ['id' => 8, 'title' => 'API Keys', 'category' => 'api_keys', 'description' => 'Integration credentials and lifecycle status.'],
        ['id' => 9, 'title' => 'Webhooks', 'category' => 'webhooks', 'description' => 'Configured webhook endpoints and delivery settings.'],
        ['id' => 10, 'title' => 'Login History', 'category' => 'login_history', 'description' => 'Authentication events and login activity.'],
        ['id' => 11, 'title' => 'Audit Logs', 'category' => 'audit_logs', 'description' => 'Security audit events and metadata details.'],
    ];

    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $search = trim((string) $request->query('search', ''));

        $reports = collect(self::REPORTS)
            ->map(fn (array $report) => array_merge($report, [
                'total_records' => $this->countReport($report['category'], $companyId, $request),
                'created_at' => now()->toDateTimeString(),
                'status' => 'Ready',
            ]));

        if ($search !== '') {
            $reports = $reports->filter(function (array $report) use ($search) {
                return str_contains(strtolower($report['title']), strtolower($search))
                    || str_contains(strtolower($report['category']), strtolower($search))
                    || str_contains(strtolower($report['description']), strtolower($search));
            });
        }

        return response()->json(['data' => $reports->values()]);
    }

    private ReportExportService $exportService;
    private ReportDocumentGenerator $documentGenerator;

    public function __construct(ReportExportService $exportService, ReportDocumentGenerator $documentGenerator)
    {
        $this->exportService = $exportService;
        $this->documentGenerator = $documentGenerator;
    }

    public function export(Request $request, int $reportId)
    {
        $format = strtolower((string) $request->query('format', 'xlsx'));
        $report = $this->findReport($reportId);

        if (! $report) {
            abort(404, 'Report not found');
        }

        if (! in_array($format, ['pdf', 'xlsx', 'csv', 'docx'], true)) {
            abort(400, 'Report format not supported');
        }

        $rows = $this->generateReportRows($reportId, $request);
        $filename = Str::slug($report['category'] . '-' . $report['title'], '-') . '.' . $format;

        $filters = $this->normalizeExportFilters($request);

        $generatedByRole = $request->user()?->roles()->pluck('name')->first() ?? 'System';

        $exportRecord = $this->exportService->createExportRecord([
            'report_title' => $report['title'],
            'report_category' => $report['category'],
            'export_format' => $format,
            'generated_by' => $request->user()?->id,
            'generated_by_role' => $generatedByRole,
            'company_id' => $request->user()?->company_id,
            'ip_address' => $request->ip(),
            'user_id' => $request->user()?->id,
            'user_agent' => $request->userAgent(),
            'applied_filters' => $filters,
            'record_count' => count($rows),
            'expires_at' => now()->addDays(30),
        ]);

        $responseHeaders = [
            'X-Report-Verification-Url' => $exportRecord['verificationUrl'],
            'X-Report-Reference-Number' => $exportRecord['export']->reference_number,
            'X-Report-Document-Version' => $exportRecord['export']->document_version,
            'X-Report-Checksum' => $exportRecord['export']->checksum,
        ];

        $metadata = $this->buildReportMetadata($request, $report, $rows, $exportRecord);


        $response = match ($format) {
            'csv' => $this->documentGenerator->buildCsv($filename, $rows, $report, $metadata, $this->buildBrandingConfig()),
            'xlsx' => $this->documentGenerator->buildXlsx($filename, $rows, $report, $metadata, $this->buildBrandingConfig()),
            'docx' => $this->documentGenerator->buildDocx($filename, $rows, $report, $metadata, $this->buildBrandingConfig()),
            'pdf' => $this->documentGenerator->buildPdf($filename, $rows, $report, $metadata, $this->buildBrandingConfig(), 'landscape', 'A4'),
        };

        $this->exportService->storeExportFile(
            $exportRecord['export'],
            $filename,
            $response->getContent(),
            $response->headers->get('Content-Type') ?? 'application/octet-stream'
        );

        return $response->withHeaders($responseHeaders);
    }

    private function findReport(int $reportId): ?array
    {
        return collect(self::REPORTS)->first(fn (array $report) => $report['id'] === $reportId);
    }

    private function normalizeExportFilters(Request $request): array
    {
        $filters = $request->query('filters', []);

        if (is_string($filters)) {
            $filters = json_decode($filters, true) ?: ['raw' => $filters];
        }

        return array_filter([
            'search' => trim((string) $request->query('search', '')),
            'company_id' => $request->query('company_id'),
            'user_id' => $request->query('user_id'),
            'role' => $request->query('role'),
            'status' => $request->query('status'),
            'delivery_status' => $request->query('delivery_status'),
            'driver_id' => $request->query('driver_id'),
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
            'filters' => $filters,
        ], fn ($value) => $value !== null && $value !== '');
    }

    private function countReport(string $category, ?int $companyId, ?Request $request = null): int
    {
        $query = match ($category) {
            'companies' => Company::query()->when($companyId, fn ($q) => $q->where('id', $companyId)),
            'company_managers' => User::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->whereHas('roles', fn ($q) => $q->where('name', 'Company Manager')),
            'company_dispatchers' => User::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->whereHas('roles', fn ($q) => $q->where('name', 'Company Dispatcher')),
            'users' => User::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            'drivers' => Driver::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            'deliveries' => Delivery::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            'customers' => Customer::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            'api_keys' => ApiKey::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            'webhooks' => WebhookEndpoint::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            'login_history' => LoginHistory::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            'audit_logs' => AuditLog::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            default => null,
        };

        if ($query === null) {
            return 0;
        }

        if ($request) {
            $this->applyReportFilters($query, $request, $category);
        }

        return $query->count();
    }

    /**
     * Apply the search/status/date-range/user/delivery filters chosen in the
     * Admin Reports UI to a report's underlying query, so that the record
     * count shown in the list and the rows included in the export always
     * reflect the exact same, complete, filtered data set.
     */
    private function applyReportFilters($query, Request $request, string $category): void
    {
        $search = trim((string) $request->query('search', ''));
        $status = trim((string) $request->query('status', ''));
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $userId = $request->query('user_id');
        $role = trim((string) $request->query('role', ''));
        $deliveryStatus = trim((string) $request->query('delivery_status', ''));

        $dateColumn = $category === 'login_history' ? 'occurred_at' : 'created_at';

        $searchableColumnsByCategory = [
            'companies' => ['name', 'slug'],
            'company_managers' => ['name', 'email'],
            'company_dispatchers' => ['name', 'email'],
            'users' => ['name', 'email'],
            'drivers' => ['name', 'email', 'phone', 'license_number'],
            'deliveries' => ['tracking_number', 'external_reference'],
            'customers' => ['name', 'email', 'phone'],
            'api_keys' => ['name', 'key_prefix'],
            'webhooks' => ['name', 'target_url'],
            'login_history' => ['ip_address', 'browser', 'device'],
            'audit_logs' => ['action'],
        ];

        $searchableColumns = $searchableColumnsByCategory[$category] ?? [];
        if ($search !== '' && $searchableColumns !== []) {
            $query->where(function ($inner) use ($searchableColumns, $search) {
                foreach ($searchableColumns as $column) {
                    $inner->orWhere($column, 'like', '%' . $search . '%');
                }
            });
        }

        $statusColumns = ['companies', 'company_managers', 'company_dispatchers', 'users', 'drivers', 'api_keys', 'webhooks'];
        if ($status !== '' && in_array($category, $statusColumns, true)) {
            $query->where('status', $status);
        }

        if ($category === 'deliveries' && $deliveryStatus !== '') {
            $query->where('status', $deliveryStatus);
        }

        if ($category === 'login_history' && $status !== '') {
            $query->where('success', in_array(strtolower($status), ['1', 'true', 'success', 'successful'], true));
        }

        if ($userId !== null && $userId !== '' && in_array($category, ['company_managers', 'company_dispatchers', 'users'], true)) {
            $query->where('id', $userId);
        }

        if ($userId !== null && $userId !== '' && in_array($category, ['login_history', 'audit_logs'], true)) {
            $query->where('user_id', $userId);
        }

        if ($role !== '' && $category === 'users') {
            $query->whereHas('roles', fn ($inner) => $inner->where('name', $role));
        }

        if ($startDate) {
            $query->whereDate($dateColumn, '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate($dateColumn, '<=', $endDate);
        }
    }

    private function generateReportRows(int $reportId, Request $request): array
    {
        $companyId = $request->user()->company_id;
        $report = $this->findReport($reportId);
        $category = $report['category'] ?? '';

        $query = match ($reportId) {
            1 => Company::query()->when($companyId, fn ($q) => $q->where('id', $companyId)),
            2 => User::query()->with('roles')
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->whereHas('roles', fn ($q) => $q->where('name', 'Company Manager')),
            3 => User::query()->with('roles')
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->whereHas('roles', fn ($q) => $q->where('name', 'Company Dispatcher')),
            4 => User::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            5 => Driver::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            6 => Delivery::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            7 => Customer::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            8 => ApiKey::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            9 => WebhookEndpoint::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            10 => LoginHistory::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            11 => AuditLog::query()->when($companyId, fn ($q) => $q->where('company_id', $companyId)),
            default => null,
        };

        if ($query === null) {
            return [];
        }

        $this->applyReportFilters($query, $request, $category);

        return match ($reportId) {
            1 => $query->get(['id', 'name', 'slug', 'status', 'created_at', 'updated_at'])
                ->map(fn ($company) => $company->toArray())
                ->toArray(),
            2, 3 => $query->get(['id', 'name', 'email', 'company_id', 'status', 'created_at'])
                ->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'company_id' => $user->company_id,
                    'roles' => $user->roles->pluck('name')->join(', '),
                    'status' => $user->status,
                    'created_at' => $user->created_at,
                ])
                ->toArray(),
            4 => $query->get(['id', 'name', 'email', 'company_id', 'status', 'created_at'])
                ->map(fn ($user) => $user->toArray())
                ->toArray(),
            5 => $query->get(['id', 'name', 'email', 'phone', 'vehicle_type', 'vehicle_number', 'license_number', 'status', 'created_at'])
                ->map(fn ($driver) => $driver->toArray())
                ->toArray(),
            6 => $query->get(['id', 'uuid', 'tracking_number', 'external_reference', 'status', 'created_at'])
                ->map(fn ($delivery) => $delivery->toArray())
                ->toArray(),
            7 => $query->get(['id', 'name', 'email', 'phone', 'created_at'])
                ->map(fn ($customer) => $customer->toArray())
                ->toArray(),
            8 => $query->get(['id', 'name', 'public_key', 'key_prefix', 'environment', 'status', 'expires_at', 'created_at'])
                ->map(fn ($apiKey) => $apiKey->toArray())
                ->toArray(),
            9 => $query->get(['id', 'name', 'target_url', 'http_method', 'status', 'retry_count', 'timeout_seconds', 'events', 'created_at'])
                ->map(fn ($endpoint) => array_merge($endpoint->toArray(), ['events' => $endpoint->events ?? []]))
                ->toArray(),
            10 => $query->get(['id', 'user_id', 'success', 'reason', 'ip_address', 'browser', 'os', 'device', 'occurred_at'])
                ->map(fn ($history) => $history->toArray())
                ->toArray(),
            11 => $query->get(['id', 'user_id', 'action', 'metadata', 'created_at'])
                ->map(fn ($audit) => $audit->toArray())
                ->toArray(),
            default => [],
        };
    }

    public function history(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $query = \App\Models\ReportExport::withCount(['logs as verification_count' => fn ($query) => $query->where('action', 'verified')])
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId));

        $exports = $query->orderBy('created_at', 'desc')
            ->limit(50)
            ->get([
                'id',
                'report_id',
                'reference_number',
                'report_title',
                'report_category',
                'export_format',
                'generated_by',
                'generated_by_role',
                'company_id',
                'record_count',
                'checksum',
                'verification_id',
                'file_path',
                'mime_type',
                'file_size',
                'expires_at',
                'created_at',
            ]);

        $exports->each->append('download_url');

        return response()->json(['data' => $exports]);
    }

    public function download(Request $request, int $exportId)
    {
        $export = \App\Models\ReportExport::findOrFail($exportId);
        $companyId = $request->user()->company_id;

        if ($companyId && $export->company_id !== $companyId) {
            abort(403, 'Unauthorized access to export history.');
        }

        $disk = Storage::disk($export->storage_disk ?? 'local');
        if (! $export->file_path || ! $disk->exists($export->file_path)) {
            abort(404, 'Export file not found.');
        }

        $content = $disk->get($export->file_path);
        $filename = $export->reference_number . '.' . strtolower($export->export_format);

        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, ['Content-Type' => $export->mime_type ?? 'application/octet-stream']);
    }

    private function buildReportMetadata(Request $request, array $report, array $rows, array $exportRecord): array
    {
        $now = now()->setTimezone('Africa/Addis_Ababa');
        $generatedByName = $request->user()?->name ?? $request->user()?->email ?? 'System';
        $generatedByRole = $request->user()?->roles()->pluck('name')->first() ?? 'System';

        return [
            'report_id' => $exportRecord['export']->report_id,
            'reference_number' => $exportRecord['export']->reference_number,
            'document_version' => $exportRecord['export']->document_version,
            'verification_url' => $exportRecord['verificationUrl'],
            'verification_id' => $exportRecord['export']->verification_id,
            'checksum' => $exportRecord['export']->checksum,
            'generated_by_name' => $generatedByName,
            'generated_by_role' => $generatedByRole,
            'generated_by_line' => trim($generatedByName . ' • ' . $generatedByRole),
            'company_name' => optional($request->user()?->company)->name ?? config('app.name', 'Logistics Integration Portal'),
            'company_id' => $request->user()?->company_id,
            'generated_at' => $now->format('l, d F Y • g:i:s A') . ' EAT (UTC+03:00)',
            'time_zone' => 'East Africa Time (EAT)',
            'environment' => app()->environment(),
            'confidentiality' => 'Confidential',
            'record_count' => count($rows),
            'reporting_period' => $request->query('reporting_period', 'All Available Records'),
            'audit_event_id' => $exportRecord['export']->id,
            'printed_by_user' => $generatedByName,
            'printed_by_role' => $generatedByRole,
            'printed_by_department' => optional($request->user()?->company)->name ?? 'Corporate Operations',
            'printed_on' => $now->format('l, d F Y • g:i:s A') . ' EAT (UTC+03:00)',
            'printed_timezone' => 'East Africa Time (EAT) – Africa/Addis_Ababa (UTC+03:00)',
        ];
    }

    private function buildBrandingConfig(): array
    {
        return [
            'platform_name' => config('app.name', 'Logistics Integration Portal'),
            'platform_logo_url' => config('branding.platform_logo_url', ''),
            'company_registration_number' => config('branding.company_registration_number', ''),
            'company_address' => config('branding.company_address', ''),
            'company_website' => config('app.url', ''),
            'support_email' => config('support.email', 'support@example.com'),
        ];
    }
}
