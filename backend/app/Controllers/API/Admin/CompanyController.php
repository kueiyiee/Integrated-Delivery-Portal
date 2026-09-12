<?php

namespace App\Controllers\API\Admin;

use App\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Models\AuditLog;
use App\Models\Company;
use App\Notifications\CompanyVerificationApproved;
use App\Notifications\CompanyVerificationRejected;
use App\Services\CompanyDeletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;

class CompanyController extends Controller
{
    public function __construct(private readonly CompanyDeletionService $companyDeletionService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Company::query();
        $hasAdminVerificationStatus = Schema::hasColumn('companies', 'admin_verification_status');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search, $hasAdminVerificationStatus) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('business_email', 'like', "%{$search}%")
                  ->orWhere('company_code', 'like', "%{$search}%")
                  ->orWhere('business_registration_number', 'like', "%{$search}%");

                if ($hasAdminVerificationStatus) {
                    $q->orWhere('admin_verification_status', 'like', "%{$search}%");
                } else {
                    $q->orWhere('approval_status', 'like', "%{$search}%");
                }
            });
        }

        if ($filter = $request->query('verification_status')) {
            match ($filter) {
                'email_verified' => $query->whereNotNull('email_verified_at'),
                'email_pending' => $query->whereNull('email_verified_at'),
                'admin_verified' => $hasAdminVerificationStatus
                    ? $query->where('admin_verification_status', 'Verified')
                    : $query->whereIn('approval_status', ['approved', 'email_verified', 'active']),
                'admin_pending' => $hasAdminVerificationStatus
                    ? $query->where('admin_verification_status', 'Pending')
                    : $query->whereIn('approval_status', ['registration_submitted', 'pending', 'pending_approval', 'under_review']),
                'admin_rejected' => $hasAdminVerificationStatus
                    ? $query->where('admin_verification_status', 'Rejected')
                    : $query->where('approval_status', 'rejected'),
                'fully_verified' => $hasAdminVerificationStatus
                    ? $query->whereNotNull('email_verified_at')->where('admin_verification_status', 'Verified')
                    : $query->whereNotNull('email_verified_at')->whereIn('approval_status', ['approved', 'email_verified', 'active']),
                'needs_attention' => $hasAdminVerificationStatus
                    ? $query->where(function ($sub) {
                        $sub->whereNull('email_verified_at')->orWhere('admin_verification_status', 'Pending')->orWhere('admin_verification_status', 'Rejected');
                    })
                    : $query->where(function ($sub) {
                        $sub->whereNull('email_verified_at')->orWhereIn('approval_status', ['registration_submitted', 'pending', 'pending_approval', 'under_review', 'rejected']);
                    }),
                default => null,
            };
        }

        $perPage = (int) $request->query('per_page', 20);
        $companies = $query->when(Schema::hasColumn('companies', 'admin_verified_by'), function ($q) {
            $q->with('adminVerifier');
        })->orderByDesc('id')->paginate($perPage);

        $meta = [
            'total' => $companies->total(),
            'active' => Company::where('status', Company::STATUS_ACTIVE)->count(),
            'suspended' => Company::where('status', Company::STATUS_SUSPENDED)->count(),
            'active_subscriptions' => Company::where('subscription_status', 'active')->count(),
            'verification_pending' => $this->countCompaniesByAdminVerificationStatus('Pending'),
            'email_verified' => Company::whereNotNull('email_verified_at')->count(),
            'email_pending' => Company::whereNull('email_verified_at')->count(),
            'admin_verified' => $this->countCompaniesByAdminVerificationStatus('Verified'),
            'admin_rejected' => $this->countCompaniesByAdminVerificationStatus('Rejected'),
            'fully_verified' => $this->countCompaniesByAdminVerificationStatus('Verified', true),
        ];

        return response()->json([
            'data' => CompanyResource::collection($companies),
            'meta' => $meta,
        ]);
    }

    public function approve(Company $company): JsonResponse
    {
        $previousAdminVerificationStatus = $company->admin_verification_status;

        $note = request()->input('note');
        $notify = filter_var(request()->input('notify', true), FILTER_VALIDATE_BOOLEAN);

        $attributes = [
            'approval_status' => 'approved',
            'approval_stage' => 'approved',
            'approved_at' => now(),
            'status' => Company::STATUS_ACTIVE,
            'business_registration_number' => $company->business_registration_number ?: $this->generateRegistrationNumber(),
        ];

        // Only set admin-specific fields if the migration/column is present.
        if (Schema::hasColumn('companies', 'admin_verification_status')) {
            $attributes['admin_verification_status'] = 'Verified';
        }

        if (Schema::hasColumn('companies', 'admin_verification_note')) {
            $attributes['admin_verification_note'] = $note;
        }

        if (Schema::hasColumn('companies', 'admin_verified_at')) {
            $attributes['admin_verified_at'] = now();
        }

        if (Schema::hasColumn('companies', 'admin_verified_by')) {
            $attributes['admin_verified_by'] = Auth::id();
        }

        $company->forceFill($attributes)->save();

        // Ensure associated users are marked as approved and active
        $company->users()->get()->each(function ($user) {
            $user->approved_at = $user->approved_at ?? now();
            $user->email_verified_at = $user->email_verified_at ?? now();
            $user->status = 'active';
            $user->save();
        });

        AuditLog::create([
            'user_id' => Auth::id(),
            'company_id' => $company->id,
            'action' => 'Company Admin Verification Approved',
            'metadata' => [
                'company_name' => $company->name,
                'previous_admin_verification_status' => $previousAdminVerificationStatus,
                'new_admin_verification_status' => 'Verified',
                'ip_address' => request()->ip(),
            ],
        ]);

        if ($notify) {
            $adminUser = Auth::user();
            $companyEmail = $company->business_email;
            app()->terminating(function () use ($company, $adminUser, $companyEmail) {
                try {
                    Notification::route('mail', $companyEmail)
                        ->notify(new CompanyVerificationApproved($company, $adminUser));
                } catch (\Throwable $e) {
                    logger()->error('Delayed notification error (CompanyVerificationApproved): ' . $e->getMessage());
                }
            });
        }

        return response()->json(['data' => new CompanyResource($company->fresh())]);
    }

    public function suspend(Company $company): JsonResponse
    {
        $company->forceFill([
            'status' => Company::STATUS_SUSPENDED,
            'suspended_at' => now(),
        ])->save();

        return response()->json(['data' => new CompanyResource($company->fresh())]);
    }

    public function restore(Company $company): JsonResponse
    {
        $company->forceFill([
            'status' => Company::STATUS_ACTIVE,
            'suspended_at' => null,
        ])->save();

        return response()->json(['data' => new CompanyResource($company->fresh())]);
    }

    public function reject(Company $company): JsonResponse
    {
        $reason = request()->input('reason');
        $note = request()->input('note');

        $previousAdminVerificationStatus = $company->admin_verification_status;
        $rejectionNote = $note ?? $reason;

        $attributes = [
            'status' => Company::STATUS_REJECTED,
            'approval_status' => 'rejected',
            'approval_stage' => 'rejected',
        ];

        if (Schema::hasColumn('companies', 'admin_verification_status')) {
            $attributes['admin_verification_status'] = 'Rejected';
        }

        if (Schema::hasColumn('companies', 'admin_verification_note')) {
            $attributes['admin_verification_note'] = $rejectionNote;
        }

        if (Schema::hasColumn('companies', 'admin_verified_at')) {
            $attributes['admin_verified_at'] = null;
        }

        if (Schema::hasColumn('companies', 'admin_verified_by')) {
            $attributes['admin_verified_by'] = Auth::id();
        }

        $company->forceFill($attributes)->save();

        AuditLog::create([
            'user_id' => Auth::id(),
            'company_id' => $company->id,
            'action' => 'Company Admin Verification Rejected',
            'metadata' => [
                'company_name' => $company->name,
                'previous_admin_verification_status' => $previousAdminVerificationStatus,
                'new_admin_verification_status' => 'Rejected',
                'notes' => $rejectionNote,
                'ip_address' => request()->ip(),
            ],
        ]);

        $adminUser = Auth::user();
        $companyEmail = $company->business_email;
        app()->terminating(function () use ($company, $adminUser, $companyEmail, $rejectionNote) {
            try {
                Notification::route('mail', $companyEmail)
                    ->notify(new CompanyVerificationRejected($company, $adminUser, $rejectionNote));
            } catch (\Throwable $e) {
                logger()->error('Delayed notification error (CompanyVerificationRejected): ' . $e->getMessage());
            }
        });

        return response()->json(['data' => new CompanyResource($company->fresh())]);
    }

    public function verifyEmail(Company $company): JsonResponse
    {
        // Admin-triggered email verification for a company and its users.
        $company->markEmailVerified(request()->ip(), request()->header('User-Agent'), request()->header('User-Agent'));

        // Mark any users on the company as email_verified and move them to pending approval
        $company->users()->whereNull('email_verified_at')->get()->each(function ($user) {
            $user->email_verified_at = now();
            $user->status = $user->status === 'pending_verification' ? 'pending_approval' : $user->status;
            $user->save();
        });

        AuditLog::create([
            'user_id' => Auth::id(),
            'company_id' => $company->id,
            'action' => 'Company Email Verified by Admin',
            'metadata' => [
                'company_name' => $company->name,
                'admin_id' => Auth::id(),
                'ip_address' => request()->ip(),
            ],
        ]);

        $adminUser = Auth::user();
        $companyEmail = $company->business_email;
        app()->terminating(function () use ($company, $adminUser, $companyEmail) {
            try {
                Notification::route('mail', $companyEmail)
                    ->notify(new \App\Notifications\CompanyEmailVerifiedByAdmin($company, $adminUser));
            } catch (\Throwable $e) {
                logger()->error('Delayed notification error (CompanyEmailVerifiedByAdmin): ' . $e->getMessage());
            }
        });

        return response()->json(['data' => $company]);
    }

    public function destroy(Company $company, Request $request): JsonResponse
    {
        $user = Auth::user();
        if (! $user || (! $user->is_system_owner && ! $user->hasRole('System Administrator'))) {
            return response()->json(['message' => 'Only system administrators can permanently delete a company.'], 403);
        }

        $confirmation = (string) $request->input('confirmation_name', '');
        $expectedName = trim((string) $company->name);
        if ($confirmation === '' || strcasecmp($confirmation, $expectedName) !== 0) {
            return response()->json(['message' => 'Please confirm the company name to continue.'], 422);
        }

        $result = $this->companyDeletionService->delete($company, $user->id, (string) $request->input('reason', 'Deleted by administrator'));

        if (! $result['deleted']) {
            return response()->json(['message' => $result['message']], $result['status'] === 'not_found' ? 404 : 500);
        }

        return response()->json(['message' => $result['message']]);
    }

    private function countCompaniesByAdminVerificationStatus(string $status, bool $requireEmailVerified = false): int
    {
        $query = Company::query();

        if ($requireEmailVerified) {
            $query->whereNotNull('email_verified_at');
        }

        if (Schema::hasColumn('companies', 'admin_verification_status')) {
            $query->where('admin_verification_status', $status);
        } elseif (Schema::hasColumn('companies', 'approval_status')) {
            $query->whereIn('approval_status', $this->approvalStatusesForAdminVerificationState($status));
        } else {
            return 0;
        }

        if ($status === 'Pending' && Schema::hasColumn('companies', 'admin_verified_at')) {
            $query->whereNull('admin_verified_at');
        }

        return $query->count();
    }

    private function approvalStatusesForAdminVerificationState(string $status): array
    {
        return match ($status) {
            'Verified' => ['approved', 'email_verified', 'active'],
            'Rejected' => ['rejected'],
            'Pending' => ['registration_submitted', 'pending', 'pending_approval', 'under_review'],
            default => [$status],
        };
    }

    private function generateRegistrationNumber(): string
    {
        return strtoupper('REG-' . uniqid());
    }
}
