<?php

namespace App\Controllers\API\Authentication;

use App\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class EmailVerificationController extends Controller
{
    public function verify(Request $request): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            return $this->redirectToFrontend('error', 'The verification link is invalid or has expired. Please request a new verification email.');
        }

        $user = User::findOrFail($request->query('id'));
        $token = (string) $request->query('token', '');

        if (sha1($user->getEmailForVerification()) !== $request->query('hash')) {
            return $this->redirectToFrontend('error', 'The verification data could not be validated. Please request a new verification email.');
        }

        if ($user->email_verified_at) {
            $this->recordAudit($request, 'email_verification.reuse', ['user_id' => $user->id]);
            return $this->redirectToFrontend('success', 'Your email address is already verified.');
        }

        if ($token === '' || ! $user->consumeEmailVerification($token)) {
            return $this->redirectToFrontend('error', 'The verification link is no longer valid. Please request a new verification email.');
        }

        $isSystemAdmin = strcasecmp($user->email, 'systemadmin@d.com') === 0 || $user->hasRole('Admin');

        $user->approved_at = $user->approved_at ?? now();
        $user->status = 'active';
        $user->save();

        if ($user->company) {
            $user->company->markEmailVerified($request->ip(), $request->header('User-Agent'), $request->header('User-Agent'));
        }

        $this->recordAudit($request, 'email_verification.completed', ['user_id' => $user->id, 'system_admin' => $isSystemAdmin]);

        if ($isSystemAdmin) {
            return $this->redirectToFrontend('success', 'Your email has been verified successfully. Your system administrator account is active and ready for use.');
        }

        return $this->redirectToFrontend('success', 'Your email has been verified successfully. Your account is active and ready to use.');
    }

    private function redirectToFrontend(string $status, string $message): RedirectResponse
    {
        $frontendBase = rtrim(config('app.frontend_url', config('app.url', 'http://localhost:5173')), '/');
        $redirectUrl = $frontendBase . '/verify-email?status=' . urlencode($status) . '&message=' . urlencode($message);

        return redirect()->to($redirectUrl);
    }

    public function resend(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);

        $email = User::normalizeEmail($request->input('email'));
        $cacheKey = 'resend_verification|' . $email . '|' . $request->ip();
        $maxAttempts = config('auth.verification.resend_limit', 6);
        $decaySeconds = config('auth.verification.resend_decay', 3600);

        if (RateLimiter::tooManyAttempts($cacheKey, $maxAttempts)) {
            return response()->json(['message' => 'If an account exists for that email, a verification link has been sent.']);
        }

        RateLimiter::hit($cacheKey, $decaySeconds);

        $user = User::where('email', $email)->first();

        if ($user && ! $user->isEmailVerified()) {
            $token = $user->beginEmailVerification();

            try {
                \Illuminate\Support\Facades\Notification::send($user, new \App\Notifications\QueuedVerifyEmail($token));
                $this->recordAudit($request, 'verification_email.resent', ['user_id' => $user->id]);
            } catch (\Exception $e) {
                // Log and continue — do not reveal internal state
                \Illuminate\Support\Facades\Log::warning('Failed to resend verification email', ['email' => $user->email, 'error' => $e->getMessage()]);
            }
        }

        return response()->json(['message' => 'If an account exists for that email, a verification link has been sent.']);
    }
}
