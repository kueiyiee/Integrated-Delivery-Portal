<?php

use App\Controllers\API\Admin\AuditLogController;
use App\Controllers\API\Admin\ApiKeyController;
use App\Controllers\API\Admin\DashboardController;
use App\Controllers\API\Admin\ReportVerificationController;
use App\Controllers\API\Admin\ReportsController;
use App\Controllers\API\Admin\CompanyController;
use App\Controllers\API\Authentication\AuthController;
use App\Controllers\API\Authentication\PasswordResetController;
use App\Controllers\API\Authentication\RegisterController;
use App\Controllers\API\Authentication\EmailVerificationController;
use App\Controllers\API\Client\CustomerController;
use App\Controllers\API\Client\DeliveryController;
use App\Controllers\Api\HealthController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', [HealthController::class, 'index']);

    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/register', [RegisterController::class, 'register'])->middleware('throttle:6,1');
    Route::post('/auth/resend-verification', [EmailVerificationController::class, 'resend'])->middleware('throttle:6,1');
    Route::get('/auth/verify-email', [EmailVerificationController::class, 'verify'])->name('api.v1.auth.verify-email');
    Route::post('/auth/forgot-password', [PasswordResetController::class, 'forgot']);
    Route::post('/auth/reset-password', [PasswordResetController::class, 'reset']);

    Route::get('/reports/verify/{token}', [ReportVerificationController::class, 'verify']);
    // Public verification endpoint for frontend mobile-first page. This
    // keeps the verification UX under /verify/:token and allows the
    // frontend to request rich, mobile-optimized results.
    Route::get('/public/reports/verify/{token}', [\App\Controllers\API\Public\VerificationController::class, 'verify'])->middleware('throttle:60,1');

    Route::post('/auth/mfa/verify', [\App\Controllers\API\Authentication\MfaController::class, 'verify'])->middleware('throttle:6,1');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/auth/mfa/setup', [\App\Controllers\API\Authentication\MfaController::class, 'setup']);
        Route::post('/auth/mfa/confirm', [\App\Controllers\API\Authentication\MfaController::class, 'confirm']);
        Route::post('/auth/mfa/recovery-codes', [\App\Controllers\API\Authentication\MfaController::class, 'generateRecoveryCodesEndpoint']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
        Route::get('/auth/security/summary', [AuthController::class, 'securitySummary']);
        Route::post('/auth/security/sessions/{session}/revoke', [AuthController::class, 'revokeSession']);
        Route::post('/auth/security/sessions/revoke-all', [AuthController::class, 'revokeAllSessions']);

        Route::prefix('admin')->middleware(['audit.log','protect.system'])->group(function (): void {
            Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('permission:manage.system');
            Route::get('/security', [DashboardController::class, 'security'])->middleware('permission:manage.system');
            Route::get('/analytics', [DashboardController::class, 'analytics'])->middleware('permission:manage.system');

            Route::get('/reports', [ReportsController::class, 'index'])->middleware('permission:view.audit_logs');
            Route::get('/reports/history', [ReportsController::class, 'history'])->middleware('permission:view.audit_logs');
            Route::get('/reports/history/{exportId}/download', [ReportsController::class, 'download'])->middleware('permission:view.audit_logs');
            Route::post('/reports/verify', [ReportVerificationController::class, 'verifyByReference'])->middleware('permission:view.audit_logs');
            Route::get('/reports/{reportId}/export', [ReportsController::class, 'export'])->middleware('permission:view.audit_logs');
            Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:view.audit_logs');
            Route::get('/companies', [CompanyController::class, 'index'])->middleware('permission:manage.system');
            Route::get('/api-keys', [ApiKeyController::class, 'index'])->middleware('permission:manage.api_keys');
            Route::get('/api-keys/export', [ApiKeyController::class, 'export'])->middleware('permission:manage.api_keys');
            Route::get('/api-keys/companies', [ApiKeyController::class, 'companies'])->middleware('permission:manage.api_keys');
            Route::post('/api-keys', [ApiKeyController::class, 'store'])->middleware('permission:manage.api_keys');
            Route::post('/companies/{company}/approve', [CompanyController::class, 'approve'])->middleware('permission:manage.system');
            Route::post('/companies/{company}/reject', [CompanyController::class, 'reject'])->middleware('permission:manage.system');
            Route::post('/companies/{company}/verify-email', [CompanyController::class, 'verifyEmail'])->middleware('permission:manage.system');
            Route::post('/companies/{company}/suspend', [CompanyController::class, 'suspend'])->middleware('permission:manage.system');
            Route::post('/companies/{company}/restore', [CompanyController::class, 'restore'])->middleware('permission:manage.system');
            Route::delete('/companies/{company}', [CompanyController::class, 'destroy'])->middleware('permission:manage.system');
        });

        Route::prefix('client')->middleware('permission:client.access')->group(function (): void {
            Route::get('/deliveries', [DeliveryController::class, 'index']);
            Route::get('/deliveries/monthly-stats', [DeliveryController::class, 'monthlyStats']);
            Route::post('/deliveries', [DeliveryController::class, 'store']);
            Route::get('/deliveries/{delivery}', [DeliveryController::class, 'show']);
            Route::put('/deliveries/{delivery}', [DeliveryController::class, 'update']);
            Route::delete('/deliveries/{delivery}', [DeliveryController::class, 'destroy']);
            Route::post('/deliveries/{delivery}/cancel', [DeliveryController::class, 'cancel']);
            Route::post('/deliveries/{delivery}/print-form', [DeliveryController::class, 'printForm']);
            Route::get('/deliveries/{delivery}/export', [DeliveryController::class, 'export']);

            Route::get('/documents', [\App\Controllers\API\Client\DocumentController::class, 'index']);
            Route::get('/documents/{export}/download', [\App\Controllers\API\Client\DocumentController::class, 'download']);

            Route::get('/customers', [CustomerController::class, 'index']);
            Route::post('/customers', [CustomerController::class, 'store']);
            
            // Company-scoped management for Company Managers / Owners
            Route::get('/company', [\App\Controllers\API\Client\CompanyController::class, 'show']);
            Route::put('/company', [\App\Controllers\API\Client\CompanyController::class, 'update']);
            Route::put('/company/password', [\App\Controllers\API\Client\CompanyController::class, 'updatePassword']);

            // Company users management (scoped)
            Route::get('/company/users', [\App\Controllers\API\Client\UserController::class, 'index']);
            Route::post('/company/users', [\App\Controllers\API\Client\UserController::class, 'store']);
            Route::put('/company/users/{user}', [\App\Controllers\API\Client\UserController::class, 'update']);
            Route::delete('/company/users/{user}', [\App\Controllers\API\Client\UserController::class, 'destroy']);
            Route::post('/company/users/{user}/suspend', [\App\Controllers\API\Client\UserController::class, 'suspend']);
            Route::post('/company/users/{user}/activate', [\App\Controllers\API\Client\UserController::class, 'activate']);
            Route::post('/company/users/{user}/reset-password', [\App\Controllers\API\Client\UserController::class, 'resetPassword']);
            Route::prefix('api-management')->group(function (): void {
                Route::get('/api-keys', [\App\Controllers\API\Client\ApiManagementController::class, 'apiKeys']);
                Route::post('/api-keys', [\App\Controllers\API\Client\ApiManagementController::class, 'createApiKey']);
                Route::post('/api-keys/{apiKey}/revoke', [\App\Controllers\API\Client\ApiManagementController::class, 'revokeApiKey']);
                Route::post('/api-keys/{apiKey}/regenerate', [\App\Controllers\API\Client\ApiManagementController::class, 'regenerateApiKey']);
                Route::delete('/api-keys/{apiKey}', [\App\Controllers\API\Client\ApiManagementController::class, 'deleteApiKey']);
                Route::get('/webhooks', [\App\Controllers\API\Client\ApiManagementController::class, 'webhooks']);
                Route::post('/webhooks', [\App\Controllers\API\Client\ApiManagementController::class, 'createWebhook']);
                Route::post('/webhooks/{webhook}/test', [\App\Controllers\API\Client\ApiManagementController::class, 'testWebhook']);
                Route::post('/webhooks/{webhook}/rotate', [\App\Controllers\API\Client\ApiManagementController::class, 'rotateWebhook']);
                Route::get('/webhooks/{webhook}/history', [\App\Controllers\API\Client\ApiManagementController::class, 'webhookHistory']);
                Route::put('/webhooks/{webhook}', [\App\Controllers\API\Client\ApiManagementController::class, 'updateWebhook']);
                Route::delete('/webhooks/{webhook}', [\App\Controllers\API\Client\ApiManagementController::class, 'deleteWebhook']);
                Route::get('/documentation', [\App\Controllers\API\Client\ApiManagementController::class, 'documentation']);
                Route::get('/usage-statistics', [\App\Controllers\API\Client\ApiManagementController::class, 'usageStatistics']);
                Route::get('/request-logs', [\App\Controllers\API\Client\ApiManagementController::class, 'requestLogs']);
            });        });

        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    });
});
