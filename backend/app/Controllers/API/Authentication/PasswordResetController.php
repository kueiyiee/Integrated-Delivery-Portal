<?php

namespace App\Controllers\API\Authentication;

use App\Controllers\Controller;
use App\Requests\Authentication\ForgotPasswordRequest;
use App\Requests\Authentication\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::sendResetLink($request->only('email'));

        $this->recordAudit($request, 'auth.password_reset.requested', [
            'email' => $request->input('email'),
            'ip_address' => $request->ip(),
            'user_agent' => $request->header('User-Agent'),
            'result' => $status === Password::RESET_LINK_SENT ? 'sent' : 'failed',
        ]);

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'If an account exists with this email address, a secure password recovery link has been sent to your inbox.']);
        }

        return response()->json(['message' => 'We are unable to process your password reset request at this time. Please try again shortly or contact support.'], 422);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset($request->only('email', 'password', 'password_confirmation', 'token'), function (User $user, string $password) {
            $user->password = Hash::make($password);
            $user->last_password_changed_at = now();
            $user->setRememberToken(Str::random(60));
            $user->save();
        });

        if ($status === Password::PASSWORD_RESET) {
            $this->recordAudit($request, 'auth.password_reset.completed', [
                'email' => $request->input('email'),
                'ip_address' => $request->ip(),
                'user_agent' => $request->header('User-Agent'),
                'result' => 'success',
            ]);

            return response()->json(['message' => 'Your password has been successfully reset. You may now sign in with your new credentials.']);
        }

        $this->recordAudit($request, 'auth.password_reset.failed', [
            'email' => $request->input('email'),
            'ip_address' => $request->ip(),
            'user_agent' => $request->header('User-Agent'),
            'result' => 'invalid_token_or_email',
        ]);

        return response()->json(['message' => 'The password reset link is invalid or has expired. Please request a new password recovery link.'], 422);
    }
}
