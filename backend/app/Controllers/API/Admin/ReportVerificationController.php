<?php

namespace App\Controllers\API\Admin;

use App\Controllers\Controller;
use App\Models\ReportExport;
use App\Services\ReportExportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ReportVerificationController extends Controller
{
    protected ReportExportService $service;

    public function __construct(ReportExportService $service)
    {
        $this->service = $service;
    }

    public function verify(Request $request, string $token): JsonResponse
    {
        $export = $this->service->verifyToken($token);

        if (! $export) {
            return response()->json([
                'status' => 'invalid',
                'message' => 'Report verification failed. No matching report could be found for the provided token.',
            ], 404);
        }

        if ($export->expires_at && $export->expires_at->isPast()) {
            return response()->json([
                'status' => 'expired',
                'message' => 'This report has expired and is no longer valid.',
            ], 410);
        }

        $this->service->markAsVerified(
            $export,
            optional($request->user())->id,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json($this->makeResultPayload($export, 'token'));
    }

    public function verifyByReference(Request $request): JsonResponse
    {
        $data = $request->validate([
            'query' => 'required|string|max:512',
        ]);

        $query = trim($data['query']);
        if ($query === '') {
            return response()->json(["status" => "invalid", "message" => "Please enter a reference number, verification URL, or token to verify."], 422);
        }

        $token = $this->parseVerificationToken($query);
        if ($token !== null) {
            return $this->verifyByToken($request, $token);
        }

        $export = ReportExport::where('reference_number', $query)
            ->orWhere('verification_id', $query)
            ->first();

        if (! $export) {
            return response()->json([
                'status' => 'invalid',
                'message' => 'Document verification failed. No matching report could be found for the provided reference input.',
            ], 404);
        }

        if ($export->expires_at && $export->expires_at->isPast()) {
            return response()->json([
                'status' => 'expired',
                'message' => 'This report has expired and can no longer be verified.',
            ], 410);
        }

        $this->service->markAsVerified(
            $export,
            optional($request->user())->id,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json($this->makeResultPayload($export, 'reference'));
    }

    private function verifyByToken(Request $request, string $token): JsonResponse
    {
        $export = $this->service->verifyToken($token);
        if (! $export) {
            return response()->json([
                'status' => 'invalid',
                'message' => 'Report verification failed. No matching report could be found for the provided token.',
            ], 404);
        }

        if ($export->expires_at && $export->expires_at->isPast()) {
            return response()->json([
                'status' => 'expired',
                'message' => 'This report has expired and is no longer valid.',
            ], 410);
        }

        $this->service->markAsVerified(
            $export,
            optional($request->user())->id,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json($this->makeResultPayload($export, 'token'));
    }

    private function parseVerificationToken(string $input): ?string
    {
        if (filter_var($input, FILTER_VALIDATE_URL)) {
            if (preg_match('#/reports/verify/([A-Za-z0-9]{64})#', $input, $matches)) {
                return $matches[1];
            }
            return null;
        }

        if (preg_match('/^[A-Za-z0-9]{64}$/', $input)) {
            return $input;
        }

        return null;
    }

    private function makeResultPayload(ReportExport $export, string $source): array
    {
        return [
            'status' => 'valid',
            'verification_source' => $source,
            'report_id' => $export->report_id,
            'reference_number' => $export->reference_number,
            'verification_id' => $export->verification_id,
            'generated_at' => $export->created_at?->toDateTimeString(),
            'generated_by' => $export->generated_by,
            'generated_by_role' => $export->generated_by_role,
            'report_category' => $export->report_category,
            'document_type' => $export->export_format,
            'verification_timestamp' => now()->toDateTimeString(),
        ];
    }
}
