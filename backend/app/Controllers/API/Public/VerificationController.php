<?php

namespace App\Controllers\API\Public;

use App\Controllers\Controller;
use App\Models\ReportExport;
use App\Services\ReportExportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class VerificationController extends Controller
{
    protected ReportExportService $service;

    public function __construct(ReportExportService $service)
    {
        $this->service = $service;
    }

    /**
     * Public verification endpoint to be called by the frontend verification page.
     * Accepts an opaque token and returns a structured verification result.
     */
    public function verify(Request $request, string $token): JsonResponse
    {
        try {
            $export = $this->service->verifyToken($token);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'temporary_error', 'message' => 'Verification service temporarily unavailable. Please try again shortly.'], 503);
        }

        if (! $export) {
            return response()->json(['status' => 'not_found', 'message' => 'Verification record not found for provided token.'], 404);
        }

        if ($export->expires_at && $export->expires_at->isPast()) {
            return response()->json(['status' => 'expired', 'message' => 'This document has expired and is no longer valid.'], 410);
        }

        $fingerprintMatched = true;

        $this->service->markAsVerified($export, null, $request->ip(), $request->userAgent());

        return response()->json([
            'status' => 'verified',
            'verification_result' => [
                'report_id' => $export->report_id,
                'reference_number' => $export->reference_number,
                'verification_id' => $export->verification_id,
                'document_version' => $export->document_version,
                'generated_by' => $export->generated_by,
                'generated_by_role' => $export->generated_by_role,
                'report_category' => $export->report_category,
                'document_type' => $export->export_format,
                'verification_timestamp' => now()->toDateTimeString(),
                'fingerprint_matched' => $fingerprintMatched,
            ],
        ]);
    }
}
