<?php

namespace App\Controllers\API\Client;

use App\Controllers\Controller;
use App\Requests\Delivery\DeliveryRequest;
use App\Http\Resources\DeliveryResource;
use App\Models\Delivery;
use App\Services\Delivery\DeliveryService;
use App\Services\ReportDocumentGenerator;
use App\Services\ReportExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DeliveryController extends Controller
{
    public function monthlyStats(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        $year = max(2000, min(2100, (int) $request->query('year', now()->year)));
        $rows = Delivery::query()
            ->where('company_id', $companyId)
            ->whereYear('created_at', $year)
            ->selectRaw('MONTH(created_at) as month, COUNT(*) as total')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy(fn ($row) => (int) $row->month);

        return response()->json(['data' => collect(range(1, 12))->map(fn (int $month) => [
            'month' => $month,
            'total' => (int) ($rows->get($month)?->total ?? 0),
        ])->values()]);
    }

    private function resolveCompanyId(Request $request): int
    {
        $companyId = $request->user()?->company_id;

        if (empty($companyId)) {
            abort(403, 'Company access is required to manage deliveries.');
        }

        return $companyId;
    }

    public function index(Request $request, DeliveryService $service): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $deliveries = $service->list($request->query(), $companyId);
        $payload = DeliveryResource::collection($deliveries)->response()->getData(true);

        return response()->json([
            'data' => $payload['data'] ?? [],
            'meta' => $payload['meta'] ?? [
                'current_page' => $deliveries->currentPage(),
                'last_page' => $deliveries->lastPage(),
                'per_page' => $deliveries->perPage(),
                'total' => $deliveries->total(),
            ],
        ]);
    }

    public function show(Delivery $delivery, Request $request, DeliveryService $service): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);

        return response()->json([
            'data' => new DeliveryResource($service->show($delivery->id, $companyId)),
        ]);
    }

    public function store(DeliveryRequest $request, DeliveryService $service): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $delivery = $service->create($request->validated(), $companyId);

        $this->recordAudit($request, 'delivery.created', [
            'delivery_id' => $delivery->id,
            'company_id' => $delivery->company_id,
            'status' => $delivery->status,
            'tracking_number' => $delivery->tracking_number,
        ]);

        return response()->json(['data' => new DeliveryResource($delivery)], 201);
    }

    public function update(Delivery $delivery, Request $request, DeliveryService $service): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $this->validate($request, [
            'tracking_number' => ['prohibited'],
            'external_reference' => ['nullable', 'string', 'max:120'],
            'pickup_address' => ['sometimes', 'array'],
            'pickup_address.line1' => ['sometimes', 'string', 'max:255'],
            'pickup_address.latitude' => ['nullable', 'numeric'],
            'pickup_address.longitude' => ['nullable', 'numeric'],
            'dropoff_address' => ['sometimes', 'array'],
            'dropoff_address.line1' => ['sometimes', 'string', 'max:255'],
            'dropoff_address.latitude' => ['nullable', 'numeric'],
            'dropoff_address.longitude' => ['nullable', 'numeric'],
            'package' => ['sometimes', 'array'],
            'package.type' => ['sometimes', 'string', Rule::in(['document', 'parcel', 'box', 'other'])],
            'package.description' => ['sometimes', 'string', 'max:255'],
            'package.quantity' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'package.weight' => ['nullable', 'numeric', 'gt:0', 'max:10000', 'required_with:package.weight_unit'],
            'package.weight_unit' => ['nullable', 'string', Rule::in(['kg', 'g']), 'required_with:package.weight'],
            'package.special_handling' => ['nullable', 'string', 'max:500'],
            'status' => ['sometimes', 'string', Rule::in([
                'pending',
                'assigned',
                'in_transit',
                'picked_up',
                'delivered',
                'cancelled',
                'failed',
            ])],
            'notes' => ['nullable', 'string', 'max:1000'],
            'scheduled_at' => ['nullable', 'date'],
            'cancel_reason' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $updated = $service->update($delivery->id, $request->only([
                'external_reference',
                'pickup_address',
                'dropoff_address',
                'package',
                'status',
                'notes',
                'scheduled_at',
                'cancel_reason',
            ]), $companyId);
        } catch (\InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        $this->recordAudit($request, 'delivery.updated', [
            'delivery_id' => $updated->id,
            'company_id' => $updated->company_id,
            'status' => $updated->status,
            'updated_fields' => array_keys($request->only([
                'tracking_number',
                'external_reference',
                'pickup_address',
                'dropoff_address',
                'status',
                'notes',
                'scheduled_at',
                'cancel_reason',
            ])),
        ]);

        return response()->json(['data' => new DeliveryResource($updated)]);
    }

    public function cancel(Delivery $delivery, Request $request, DeliveryService $service): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $this->validate($request, [
            'cancel_reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $updated = $service->cancel($delivery->id, $request->only(['cancel_reason', 'notes']), $companyId);
        } catch (\InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        $this->recordAudit($request, 'delivery.cancelled', [
            'delivery_id' => $updated->id,
            'company_id' => $updated->company_id,
            'cancel_reason' => $updated->cancel_reason,
            'status' => $updated->status,
        ]);

        return response()->json(['data' => new DeliveryResource($updated)]);
    }

    public function printForm(Delivery $delivery, Request $request, DeliveryService $service, ReportExportService $exportService): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $delivery = $service->show($delivery->id, $companyId);

        $user = $request->user();
        $generatedByName = $user?->name ?? $user?->email ?? 'Unknown';

        $exportPayload = $exportService->createExportRecord([
            'report_title' => sprintf('Delivery Print Form: %s', $delivery->tracking_number),
            'report_category' => 'delivery_form',
            'export_format' => 'html',
            'generated_by' => $user?->id,
            'generated_by_role' => null,
            'company_id' => $companyId,
            'user_id' => $user?->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'record_count' => 1,
            'document_version' => '1.0',
        ]);

        return response()->json(['data' => [
            'delivery' => new DeliveryResource($delivery),
            'verification_token' => $exportPayload['verificationToken'],
            'verification_url' => $exportPayload['verificationUrl'],
        ]], 201);
    }

    public function export(Delivery $delivery, Request $request, DeliveryService $service, ReportExportService $exportService, ReportDocumentGenerator $documentGenerator)
    {
        $companyId = $this->resolveCompanyId($request);
        $delivery = $service->show($delivery->id, $companyId);

        $format = strtolower((string) $request->query('format', 'pdf'));
        if (! in_array($format, ['pdf', 'docx'], true)) {
            abort(400, 'Export format not supported. Use pdf or docx.');
        }

        $report = [
            'title' => sprintf('Delivery Document: %s', $delivery->tracking_number),
            'category' => 'delivery_document',
        ];

        $rows = $this->buildDeliveryRows($delivery);
        $filename = Str::slug($delivery->tracking_number ?: $delivery->uuid, '-') . '.' . $format;

        $generatedByName = $request->user()?->name ?? $request->user()?->email ?? 'System';
        $generatedByRole = $request->user()?->roles()->pluck('name')->first() ?? 'Company User';

        $exportRecord = $exportService->createExportRecord([
            'report_title' => $report['title'],
            'report_category' => $report['category'],
            'export_format' => $format,
            'generated_by' => $request->user()?->id,
            'generated_by_role' => $generatedByRole,
            'company_id' => $companyId,
            'user_id' => $request->user()?->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'applied_filters' => ['delivery_id' => $delivery->id],
            'record_count' => 1,
            'expires_at' => now()->addDays(30),
        ]);

        $metadata = $this->buildDeliveryMetadata($request, $delivery, $rows, $exportRecord);
        $branding = $this->buildBrandingConfig($request);

        $response = match ($format) {
            'docx' => $documentGenerator->buildDocx($filename, $rows, $report, $metadata, $branding),
            default => $documentGenerator->buildPdf($filename, $rows, $report, $metadata, $branding, 'portrait', 'A4'),
        };

        $exportService->storeExportFile(
            $exportRecord['export'],
            $filename,
            $response->getContent(),
            $response->headers->get('Content-Type') ?? 'application/octet-stream'
        );

        return $response->withHeaders([
            'X-Report-Verification-Url' => $exportRecord['verificationUrl'],
            'X-Report-Reference-Number' => $exportRecord['export']->reference_number,
            'X-Report-Document-Version' => $exportRecord['export']->document_version,
            'X-Report-Checksum' => $exportRecord['export']->checksum,
        ]);
    }

    private function buildDeliveryRows(Delivery $delivery): array
    {
        $package = is_array($delivery->package) ? $delivery->package : [];

        return [[
            'Tracking Number' => $delivery->tracking_number,
            'Reference' => $delivery->external_reference ?? 'N/A',
            'Status' => $this->formatStatus($delivery->status),
            'Scheduled At' => optional($delivery->scheduled_at)->toDateTimeString() ?? 'N/A',
            'Pickup Address' => $this->formatAddress($delivery->pickup_address),
            'Dropoff Address' => $this->formatAddress($delivery->dropoff_address),
            'Package Type' => $package['type'] ?? 'N/A',
            'Package Description' => $package['description'] ?? 'N/A',
            'Package Quantity' => $package['quantity'] ?? 'N/A',
            'Package Weight' => $this->formatPackageWeight($package),
            'Special Handling' => $package['special_handling'] ?? 'N/A',
            'Notes' => $delivery->notes ?? 'N/A',
            'Cancellation Reason' => $delivery->cancel_reason ?? 'N/A',
            'Created At' => optional($delivery->created_at)->toDateTimeString() ?? 'N/A',
            'Updated At' => optional($delivery->updated_at)->toDateTimeString() ?? 'N/A',
            'Status History' => json_encode($delivery->status_history ?? [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]];
    }

    private function formatAddress(?array $address): string
    {
        if (empty($address) || ! is_array($address)) {
            return 'N/A';
        }

        $parts = array_filter([
            $address['line1'] ?? null,
            $address['address'] ?? null,
            isset($address['latitude']) ? 'Lat: ' . $address['latitude'] : null,
            isset($address['longitude']) ? 'Lng: ' . $address['longitude'] : null,
        ]);

        return $parts === [] ? 'N/A' : implode(', ', $parts);
    }

    private function formatPackageWeight(?array $package): string
    {
        if (empty($package) || ! is_array($package)) {
            return 'N/A';
        }

        if (isset($package['weight']) && $package['weight'] !== null) {
            $unit = $package['weight_unit'] ?? 'kg';
            return sprintf('%s %s', $package['weight'], $unit);
        }

        return 'N/A';
    }

    private function formatStatus(string $status): string
    {
        return ucwords(str_replace('_', ' ', $status));
    }

    private function buildDeliveryMetadata(Request $request, Delivery $delivery, array $rows, array $exportRecord): array
    {
        $now = now()->setTimezone('Africa/Addis_Ababa');
        $generatedByName = $request->user()?->name ?? $request->user()?->email ?? 'System';
        $generatedByRole = $request->user()?->roles()->pluck('name')->first() ?? 'Company User';

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
            'reporting_period' => 'Delivery record',
            'audit_event_id' => $exportRecord['export']->id,
            'printed_by_user' => $generatedByName,
            'printed_by_role' => $generatedByRole,
            'printed_by_department' => optional($request->user()?->company)->name ?? 'Corporate Operations',
            'printed_on' => $now->format('l, d F Y • g:i:s A') . ' EAT (UTC+03:00)',
            'printed_timezone' => 'East Africa Time (EAT) – Africa/Addis_Ababa (UTC+03:00)',
            'delivery_tracking_number' => $delivery->tracking_number,
            'delivery_status' => $this->formatStatus($delivery->status),
            'delivery_reference' => $delivery->external_reference ?? 'N/A',
            'approved_by_name' => '________________',
            'reviewed_by_name' => '________________',
            'approval_required' => true,
        ];
    }

    private function buildBrandingConfig(Request $request): array
    {
        return [
            'platform_name' => config('app.name', 'Logistics Integration Portal'),
            'platform_logo_url' => config('branding.platform_logo_url', ''),
            'company_registration_number' => optional($request->user()?->company)->business_registration_number ?? config('branding.company_registration_number', ''),
            'company_address' => optional($request->user()?->company)->address ?? config('branding.company_address', ''),
            'company_website' => config('app.url', ''),
            'support_email' => config('support.email', 'support@example.com'),
        ];
    }

    public function destroy(Delivery $delivery, Request $request, DeliveryService $service): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $service->delete($delivery->id, $companyId);

        $this->recordAudit($request, 'delivery.deleted', [
            'delivery_id' => $delivery->id,
            'company_id' => $companyId,
            'tracking_number' => $delivery->tracking_number,
        ]);

        return response()->json([], 204);
    }
}
