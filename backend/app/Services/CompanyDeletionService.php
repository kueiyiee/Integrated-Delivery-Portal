<?php

namespace App\Services;

use App\Models\ApiKey;
use App\Models\ApiKeyLog;
use App\Models\ApiRequestLog;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\DeveloperApplication;
use App\Models\Driver;
use App\Models\LoginHistory;
use App\Models\ReportExport;
use App\Models\ReportExportLog;
use App\Models\User;
use App\Models\UserSession;
use App\Models\Webhook;
use App\Models\WebhookEndpoint;
use App\Models\WebhookEndpointLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CompanyDeletionService
{
    public function delete(Company $company, ?int $actorId = null, ?string $reason = null): array
    {
        return DB::transaction(function () use ($company, $actorId, $reason): array {
            $companyId = $company->getKey();

            $company->refresh();
            if (! $company->exists) {
                return [
                    'deleted' => false,
                    'status' => 'not_found',
                    'message' => 'Company not found.',
                ];
            }

            $companyName = $company->name;
            $actorId = $actorId ?? null;
            $reason = $reason ?: 'Deleted by administrator';

            $companyUsers = User::query()->where('company_id', $companyId)->get();
            $companyUsers->each(function (User $user) {
                $user->forceFill([
                    'company_id' => null,
                    'status' => 'disabled',
                ])->save();
            });

            User::query()->where('company_id', $companyId)->update(['company_id' => null]);
            UserSession::query()->where('company_id', $companyId)->delete();
            LoginHistory::query()->where('company_id', $companyId)->delete();

            $userIds = $companyUsers->pluck('id')->filter()->all();
            if (! empty($userIds)) {
                DB::table('role_user')->whereIn('user_id', $userIds)->delete();
                DB::table('personal_access_tokens')->whereIn('tokenable_id', $userIds)->where('tokenable_type', User::class)->delete();
            }

            ApiKeyLog::query()->where('company_id', $companyId)->delete();
            ApiRequestLog::query()->where('company_id', $companyId)->delete();
            ReportExportLog::query()->whereHas('export', function ($query) use ($companyId) {
                $query->where('company_id', $companyId);
            })->delete();
            ReportExport::query()->where('company_id', $companyId)->get()->each(function (ReportExport $export) {
                if ($export->file_path) {
                    try {
                        Storage::disk($export->storage_disk ?? 'public')->delete($export->file_path);
                    } catch (\Throwable $e) {
                        logger()->warning('Failed to delete report export file during company deletion', ['company_id' => $export->company_id, 'export_id' => $export->id, 'error' => $e->getMessage()]);
                    }
                }
            });
            ReportExport::query()->where('company_id', $companyId)->delete();

            Customer::query()->where('company_id', $companyId)->delete();
            Delivery::query()->where('company_id', $companyId)->delete();
            Driver::query()->where('company_id', $companyId)->delete();
            DeveloperApplication::query()->where('company_id', $companyId)->delete();

            $webhookEndpoints = WebhookEndpoint::query()->where('company_id', $companyId)->get();
            foreach ($webhookEndpoints as $endpoint) {
                WebhookEndpointLog::query()->where('webhook_endpoint_id', $endpoint->getKey())->delete();
                if ($endpoint->getAttribute('secret_cipher')) {
                    $endpoint->forceFill(['secret_cipher' => null, 'status' => 'disabled'])->save();
                }
            }
            WebhookEndpoint::query()->where('company_id', $companyId)->delete();
            Webhook::query()->where('company_id', $companyId)->delete();

            ApiKey::query()->where('company_id', $companyId)->get()->each(function (ApiKey $key) {
                $updates = [
                    'status' => 'revoked',
                    'revoked_at' => now(),
                    'secret_hash' => null,
                ];

                if (Schema::hasColumn('api_keys', 'signing_key_hash')) {
                    $updates['signing_key_hash'] = null;
                }

                $key->forceFill($updates)->save();
            });
            ApiKey::query()->where('company_id', $companyId)->delete();

            $company->forceFill([
                'status' => Company::STATUS_ARCHIVED,
                'deletion_type' => Company::DELETION_TYPE_ADMIN,
                'deletion_reason' => $reason,
            ])->save();

            AuditLog::create([
                'user_id' => $actorId,
                'company_id' => $companyId,
                'action' => 'COMPANY_PERMANENTLY_DELETED',
                'metadata' => [
                    'company_name' => $companyName,
                    'reason' => $reason,
                    'deleted_at' => now()->toISOString(),
                ],
            ]);

            $company->delete();

            return [
                'deleted' => true,
                'status' => 'deleted',
                'message' => 'Company permanently deleted successfully.',
            ];
        });
    }
}
