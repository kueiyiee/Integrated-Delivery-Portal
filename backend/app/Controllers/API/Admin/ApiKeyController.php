<?php

namespace App\Controllers\API\Admin;

use App\Controllers\Controller;
use App\Requests\Api\GenerateApiKeyRequest;
use App\Models\ApiKey;
use App\Models\Company;
use App\Services\ApiKeyService;
use App\Services\ReportExportService;
use App\Services\ReportDocumentGenerator;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ApiKeyController extends Controller
{
    private ReportExportService $exportService;
    private ReportDocumentGenerator $documentGenerator;

    public function __construct(private ApiKeyService $apiKeyService, ReportExportService $exportService, ReportDocumentGenerator $documentGenerator)
    {
        $this->exportService = $exportService;
        $this->documentGenerator = $documentGenerator;
    }

    public function index(Request $request): JsonResponse
    {
        $companyId = $request->query('company_id');
        $perPage = max(1, min(100, (int) $request->query('per_page', 20)));

        $query = ApiKey::with('company')
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
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

    public function companies(): JsonResponse
    {
        $companies = Company::select(['id', 'name', 'business_email', 'status'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $companies]);
    }

    public function store(GenerateApiKeyRequest $request): JsonResponse
    {
        $companyId = $request->input('company_id');
        $name = $request->input('name');
        $description = $request->input('description');
        $permissions = $request->input('permissions', []);
        $environment = $request->input('environment', 'production');
        $expiresAt = $request->input('expires_at') ? Carbon::parse($request->input('expires_at')) : null;

        $result = $this->apiKeyService->create(
            $companyId,
            Auth::id(),
            $name,
            $description,
            $permissions,
            $environment,
            $expiresAt,
        );

        $this->recordAudit(request(), 'api_key.created', [
            'company_id' => $companyId,
            'created_by' => Auth::id(),
            'name' => $name,
            'environment' => $environment,
            'permissions' => $permissions,
        ]);

        return response()->json([
            'data' => [
                'api_key' => $result['api_key'],
                'secret' => $result['secret'],
            ],
        ]);
    }

    public function export(Request $request)
    {
        $companyId = $request->query('company_id');
        $query = ApiKey::with('company')
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->orderByDesc('created_at');

        $rows = $query->get()->map(function (ApiKey $key) {
            return [
                'ID' => $key->id,
                'Company' => $key->company?->name ?? 'System',
                'Name' => $key->name,
                'Public key' => $key->public_key,
                'Environment' => $key->environment,
                'Status' => $key->status,
                'Expires at' => $key->expires_at?->toDateTimeString() ?? '',
                'Created at' => $key->created_at?->toDateTimeString() ?? '',
                'Updated at' => $key->updated_at?->toDateTimeString() ?? '',
            ];
        })->toArray();

        $report = [
            'title' => 'API Keys',
            'category' => 'api_keys',
        ];

        $filename = 'api-keys' . ($companyId ? "-company-{$companyId}" : '') . '-' . Str::slug(now()->toDateTimeString(), '-') . '.csv';

        $generatedByName = $request->user()?->name ?? $request->user()?->email ?? 'System';
        $generatedByRole = $request->user()?->roles()->pluck('name')->first() ?? 'System';

        $exportRecord = $this->exportService->createExportRecord([
            'report_title' => $report['title'],
            'report_category' => $report['category'],
            'export_format' => 'csv',
            'generated_by' => $request->user()?->id,
            'generated_by_role' => $generatedByRole,
            'company_id' => $companyId,
            'user_id' => $request->user()?->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'applied_filters' => ['company_id' => $companyId],
            'record_count' => count($rows),
            'expires_at' => now()->addDays(30),
            'document_version' => '1.0',
        ]);

        $metadata = [
            'report_id' => $exportRecord['export']->report_id,
            'reference_number' => $exportRecord['export']->reference_number,
            'document_version' => $exportRecord['export']->document_version,
            'verification_url' => $exportRecord['verificationUrl'],
            'verification_id' => $exportRecord['export']->verification_id,
            'checksum' => $exportRecord['export']->checksum,
            'generated_by_name' => $generatedByName,
            'generated_by_role' => $generatedByRole,
            'generated_by_line' => trim($generatedByName . ' • ' . $generatedByRole),
            'company_name' => optional($request->user()?->company)->name ?? config('app.name', 'Integration Delivery Portal'),
            'generated_at' => now()->setTimezone('Africa/Addis_Ababa')->format('l, d F Y • g:i:s A') . ' EAT (UTC+03:00)',
            'record_count' => count($rows),
        ];

        $response = $this->documentGenerator->buildCsv($filename, $rows, $report, $metadata, $this->buildBrandingConfig());

        $this->exportService->storeExportFile(
            $exportRecord['export'],
            $filename,
            $response->getContent(),
            $response->headers->get('Content-Type') ?? 'text/csv'
        );

        return $response->withHeaders([
            'X-Report-Verification-Url' => $exportRecord['verificationUrl'],
            'X-Report-Reference-Number' => $exportRecord['export']->reference_number,
            'X-Report-Document-Version' => $exportRecord['export']->document_version,
            'X-Report-Checksum' => $exportRecord['export']->checksum,
        ]);
    }

    private function buildBrandingConfig(): array
    {
        return [
            'platform_name' => config('app.name', 'Integration Delivery Portal'),
            'platform_logo_url' => config('branding.platform_logo_url', ''),
            'company_registration_number' => config('branding.company_registration_number', ''),
            'company_address' => config('branding.company_address', ''),
            'company_website' => config('app.url', ''),
            'support_email' => config('support.email', 'support@example.com'),
        ];
    }
}
