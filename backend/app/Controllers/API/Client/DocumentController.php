<?php

namespace App\Controllers\API\Client;

use App\Controllers\Controller;
use App\Models\ReportExport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;

        if (! $companyId) {
            return response()->json(['data' => []]);
        }

        $query = ReportExport::query()
            ->where('company_id', $companyId)
            ->orderByDesc('created_at');

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder->where('report_title', 'like', "%{$search}%")
                    ->orWhere('report_category', 'like', "%{$search}%")
                    ->orWhere('reference_number', 'like', "%{$search}%")
                    ->orWhere('verification_id', 'like', "%{$search}%")
                    ->orWhere('export_format', 'like', "%{$search}%");
            });
        }

        $exports = $query->limit(50)->get([
            'id',
            'report_id',
            'reference_number',
            'verification_id',
            'report_title',
            'report_category',
            'export_format',
            'generated_by',
            'generated_by_role',
            'company_id',
            'record_count',
            'checksum',
            'file_path',
            'mime_type',
            'file_size',
            'expires_at',
            'created_at',
        ]);

        $payload = $exports->map(function (ReportExport $export): array {
            $expiresAt = $export->expires_at ? $export->expires_at->toIso8601String() : null;
            $isExpired = $export->expires_at ? $export->expires_at->isPast() : false;

            return [
                'id' => $export->id,
                'report_id' => $export->report_id,
                'reference_number' => $export->reference_number,
                'verification_id' => $export->verification_id,
                'report_title' => $export->report_title,
                'report_category' => $export->report_category,
                'export_format' => $export->export_format,
                'generated_by' => $export->generated_by,
                'generated_by_role' => $export->generated_by_role,
                'company_id' => $export->company_id,
                'record_count' => $export->record_count,
                'file_path' => $export->file_path,
                'mime_type' => $export->mime_type,
                'file_size' => $export->file_size,
                'expires_at' => $expiresAt,
                'is_expired' => $isExpired,
                'created_at' => $export->created_at?->toIso8601String(),
                'download_url' => url('/api/v1/client/documents/' . $export->id . '/download'),
            ];
        })->values();

        return response()->json(['data' => $payload]);
    }

    public function download(Request $request, ReportExport $export)
    {
        $companyId = $request->user()?->company_id;

        if ($companyId && $export->company_id !== $companyId) {
            abort(403, 'Unauthorized access to document.');
        }

        $disk = Storage::disk($export->storage_disk ?? 'local');
        if (! $export->file_path || ! $disk->exists($export->file_path)) {
            abort(404, 'Document not found.');
        }

        $content = $disk->get($export->file_path);
        $extension = strtolower((string) $export->export_format);
        $filename = ($export->reference_number ?: $export->report_id ?: 'document') . '.' . ($extension !== '' ? $extension : 'bin');

        return response()->streamDownload(function () use ($content): void {
            echo $content;
        }, $filename, ['Content-Type' => $export->mime_type ?? 'application/octet-stream']);
    }
}
