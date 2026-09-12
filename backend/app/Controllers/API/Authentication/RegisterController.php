<?php

namespace App\Controllers\API\Authentication;

use App\Controllers\Controller;
use App\Requests\Authentication\RegisterRequest;
use App\Services\Authentication\AuthenticationService;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    public function register(RegisterRequest $request, AuthenticationService $service): JsonResponse
    {
        $payload = $request->validated();

        $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');
        if (strcasecmp($payload['email'] ?? '', $systemEmail) === 0 && ! app()->runningInConsole()) {
            abort(403, 'Registration with the system administrator account is managed separately. Please use the system setup process or contact your administrator.');
        }

        // Pre-check for previous company deletion type to provide clear messaging
        $normalizedEmail = \App\Models\User::normalizeEmail($payload['email']);
        $previousCompany = \App\Models\Company::where('business_email', $normalizedEmail)->orderByDesc('id')->first();
        $previousWasAutoDeleted = $previousCompany && $previousCompany->deletion_type === \App\Models\Company::DELETION_TYPE_AUTO;

        $user = $service->register($payload);

        if (strcasecmp($user->email, $systemEmail) === 0) {
            $message = 'Welcome to the Delivery Portal. Your system administrator account has been established and is ready for immediate access.';
        } elseif ($previousWasAutoDeleted) {
            $message = 'Previous company account was removed automatically. You can register again using this email. A verification link has been sent to your email.';
        } else {
            $message = 'Your registration was successful! Your company account is active and ready for immediate access.';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'user' => $user->only(['id', 'name', 'email', 'status', 'company_id']),
        ], 201);
    }
}
