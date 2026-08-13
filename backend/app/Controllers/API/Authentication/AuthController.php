<?php

namespace App\Controllers\API\Authentication;

use App\Controllers\Controller;
use App\Requests\Authentication\LoginRequest;
use App\Models\AuditLog;
use App\Models\LoginHistory;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Authentication\AuthenticationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function login(LoginRequest $request, AuthenticationService $service): JsonResponse
    {
        Log::info('AuthController@login received request', ['email' => $request->input('email')]);
        $data = $request->validated();
        $key = 'login_attempt|' . Str::lower($data['email']) . '|' . $request->ip();
        $max = config('auth.lockout.attempts_rate_limit', 10);
        if (RateLimiter::tooManyAttempts($key, $max)) {
            Log::warning('AuthController@login rate limited', ['key' => $key]);
            return response()->json(['message' => 'Multiple unsuccessful login attempts have been detected. Your account has been temporarily secured. Please try again in 15 minutes or contact support.'], 429);
        }
        Log::info('AuthController@login validated request', ['email' => $data['email']]);
        $result = $service->authenticate($data);

        if (isset($result['mfa_required']) && $result['mfa_required']) {
            return response()->json([
                'success' => true,
                'mfa_required' => true,
                'challenge_token' => $result['challenge_token'],
            ]);
        }

        $token = $result['token'];
        $user = $result['user'];

        if ($user) {
            $user->loadMissing([
                'roles:id,name',
                'roles.permissions:id,name',
                'company:id,name,slug,status,company_code,business_registration_number,subscription_status,email_verified_at,admin_verification_status,approval_status',
            ]);

            $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');
            $isSystemOwner = strcasecmp($user->email, $systemEmail) === 0 || $user->roles->contains('is_system', true);

            $responseUser = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'company_id' => $user->company_id,
                'is_system_owner' => $isSystemOwner,
                'company' => $user->company ? $user->company->only(['id', 'name', 'slug', 'status', 'company_code', 'business_registration_number', 'subscription_status', 'email_verified_at', 'admin_verification_status', 'approval_status']) : null,
                'roles' => $user->roles->map(function ($role) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'permissions' => $role->permissions->map(function ($permission) {
                            return [
                                'id' => $permission->id,
                                'name' => $permission->name,
                            ];
                        })->all(),
                    ];
                })->all(),
            ];
        } else {
            $responseUser = null;
        }

        $response = [
            'success' => true,
            'message' => 'Welcome back. Your secure Delivery Portal dashboard is loading now.',
            'token' => $token,
            'user' => $responseUser,
        ];

        Log::info('AuthController@login returning', ['response' => $response]);

        return response()->json($response);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', 'min:8'],
            'password_confirmation' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password provided does not match our records. Please verify and try again.'], 422);
        }

        $user->password = Hash::make($data['password']);
        $user->last_password_changed_at = now();
        $user->save();

        $this->recordAudit($request, 'auth.password.changed', [
            'user_id' => $user->id,
            'company_id' => $user->company_id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->header('User-Agent'),
        ]);

        return response()->json(['message' => 'Your password has been successfully updated. Please use your new credentials for future sign-ins.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing([
            'roles:id,name',
            'roles.permissions:id,name',
            'company:id,name,slug,status,company_code,business_registration_number,subscription_status,email_verified_at,admin_verification_status,approval_status',
        ]);

        // mark whether this user is the configured system owner
        $systemEmail = config('platform.system_owner_email', 'systemadmin@d.com');
        $user->setAttribute('is_system_owner', strcasecmp($user->email, $systemEmail) === 0 || $user->roles->contains('is_system', true));

        return response()->json(['user' => $user]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $rules = [
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'gender' => ['nullable', 'string', 'max:32'],
            'bio' => ['nullable', 'string', 'max:1000'],
        ];

        // Validate non-file fields first.
        $data = $request->validate($rules);

        // Handle profile_photo flexibly: accept an uploaded file (preferred)
        // or an existing URL/string. Provide clear, actionable error messages.
        $profilePhotoIsFile = false;
        $profilePhotoValue = null;

        if ($request->hasFile('profile_photo')) {
            $profilePhotoIsFile = true;
            $request->validate([
                'profile_photo' => ['file', 'max:10240'],
            ], [
                'profile_photo.max' => 'The profile photo must be smaller than 10MB.',
            ]);

            $profilePhotoValue = $request->file('profile_photo');
        } elseif (($allFilesPhoto = $request->allFiles()['profile_photo'] ?? null) instanceof \Illuminate\Http\UploadedFile) {
            $profilePhotoIsFile = true;
            $profilePhotoValue = $allFilesPhoto;
        } elseif ($request->has('profile_photo')) {
            $inputPhoto = $request->input('profile_photo');

            if ($inputPhoto instanceof \Illuminate\Http\UploadedFile) {
                $profilePhotoIsFile = true;
                $profilePhotoValue = $inputPhoto;
            } elseif (! is_null($inputPhoto) && ! is_string($inputPhoto)) {
                if (is_object($inputPhoto) && method_exists($inputPhoto, 'getRealPath')) {
                    $profilePhotoIsFile = true;
                    $profilePhotoValue = $inputPhoto;
                } else {
                    return response()->json(['message' => 'The profile_photo field must be a string (URL) or an uploaded image file.'], 422);
                }
            } else {
                $data['profile_photo'] = $inputPhoto;
            }
        }

        $attributes = ['name' => $data['name'] ?? $user->name];

        if (Schema::hasColumn('users', 'phone')) {
            $attributes['phone'] = $data['phone'] ?? $user->phone;
        }

        if (Schema::hasColumn('users', 'gender')) {
            $attributes['gender'] = $data['gender'] ?? $user->gender;
        }

        if (Schema::hasColumn('users', 'bio')) {
            $attributes['bio'] = $data['bio'] ?? $user->bio;
        }

        if (Schema::hasColumn('users', 'profile_photo')) {
            if ($profilePhotoIsFile && $profilePhotoValue) {
                try {
                    // Determine whether the uploaded file is an image using server-side detection.
                    $isImage = false;
                    $mime = $profilePhotoValue->getMimeType();
                    if ($mime && strpos($mime, 'image/') === 0) {
                        $isImage = true;
                    } else {
                        // Fallback to getimagesize when possible.
                        $realPath = $profilePhotoValue->getRealPath();
                        if ($realPath && @getimagesize($realPath) !== false) {
                            $isImage = true;
                        }
                    }

                    if (! $isImage) {
                        return response()->json(['message' => 'Uploaded file is not a recognized image. Please upload a valid image file.'], 422);
                    }

                    $path = $profilePhotoValue->store('profile_photos', 'public');
                    if (! $path) {
                        Log::error('AuthController@updateProfile failed to store uploaded file', ['user_id' => $user->id]);
                        return response()->json(['message' => 'Failed to store uploaded profile photo. Check server storage configuration and permissions.'], 500);
                    }

                    $attributes['profile_photo'] = asset('storage/' . $path);
                } catch (\Throwable $e) {
                    Log::error('AuthController@updateProfile exception while storing profile photo', ['user_id' => $user->id, 'exception' => $e->getMessage()]);
                    return response()->json(['message' => 'An error occurred while saving the profile photo. Please try again later.'], 500);
                }
            } else {
                // Handle string inputs: accept data-URL (base64 image) or a URL/string path.
                $inputPhoto = $data['profile_photo'] ?? null;
                if (! is_null($inputPhoto) && is_string($inputPhoto)) {
                    // Data URL (base64) handling: data:image/<type>;base64,<data>
                    if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/', $inputPhoto, $matches)) {
                        $mimeType = $matches[1];
                        $base64Data = $matches[2];
                        $decoded = base64_decode($base64Data);
                        if ($decoded === false) {
                            return response()->json(['message' => 'Provided profile_photo data URL is not valid base64.'], 422);
                        }

                        // Determine extension from mime type
                        $ext = explode('/', $mimeType)[1] ?? 'png';
                        $filename = 'profile_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
                        $path = 'profile_photos/' . $filename;

                        try {
                            $stored = Storage::disk('public')->put($path, $decoded);
                            if (! $stored) {
                                Log::error('AuthController@updateProfile failed to store decoded data-url image', ['user_id' => $user->id]);
                                return response()->json(['message' => 'Failed to store provided profile photo. Check server storage configuration and permissions.'], 500);
                            }
                            $attributes['profile_photo'] = asset('storage/' . $path);
                        } catch (\Throwable $e) {
                            Log::error('AuthController@updateProfile exception while storing data-url image', ['user_id' => $user->id, 'exception' => $e->getMessage()]);
                            return response()->json(['message' => 'An error occurred while saving the profile photo. Please try again later.'], 500);
                        }
                    } else {
                        // If it's a URL, validate it. If it looks like a URL, accept; otherwise accept as string path.
                        if (filter_var($inputPhoto, FILTER_VALIDATE_URL)) {
                            $attributes['profile_photo'] = $inputPhoto;
                        } else {
                            // Allow relative/storage paths or other strings — assign as-is.
                            $attributes['profile_photo'] = $inputPhoto;
                        }
                    }
                } else {
                    $attributes['profile_photo'] = $user->profile_photo;
                }
            }
        }

        try {
            $user->forceFill($attributes)->save();
        } catch (\Throwable $e) {
            Log::error('AuthController@updateProfile failed to save user', ['user_id' => $user->id, 'exception' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to save profile changes. Please try again later.'], 500);
        }

        return response()->json(['message' => 'Your profile has been updated successfully.', 'user' => $user]);
    }

    public function securitySummary(Request $request): JsonResponse
    {
        $user = $request->user();

        $loginHistory = LoginHistory::where('user_id', $user->id)
            ->orderByDesc('occurred_at')
            ->limit(10)
            ->get(['id', 'ip_address', 'browser', 'os', 'device', 'success', 'reason', 'occurred_at']);

        $sessions = UserSession::where('user_id', $user->id)
            ->orderByDesc('last_activity')
            ->limit(10)
            ->get(['id', 'ip_address', 'browser', 'os', 'device', 'user_agent', 'last_activity', 'expires_at', 'revoked']);

        $activityLogs = AuditLog::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'action', 'metadata', 'created_at']);

        return response()->json([
            'mfa_enabled' => (bool) $user->mfa_enabled,
            'login_history' => $loginHistory,
            'sessions' => $sessions,
            'activity_logs' => $activityLogs,
        ]);
    }

    public function revokeSession(Request $request, UserSession $session): JsonResponse
    {
        if ($session->user_id !== $request->user()->id) {
            return response()->json(['message' => 'The selected session could not be found.'], 404);
        }

        $session->revoked = true;
        $session->save();

        return response()->json(['message' => 'The selected session has been revoked.']);
    }

    public function revokeAllSessions(Request $request): JsonResponse
    {
        $user = $request->user();

        UserSession::where('user_id', $user->id)
            ->where('revoked', false)
            ->update(['revoked' => true]);

        return response()->json(['message' => 'All active sessions have been revoked.']);
    }

    /**
     * Securely end the authenticated user's current session.
     *
     * Revokes the Sanctum access token used to make this request (so it can
     * no longer be used to authenticate future API calls) and marks the
     * user's most recent active session record as revoked.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revoke the token that was used to authenticate this request so it
        // can never be reused after logout.
        $currentToken = $user?->currentAccessToken();
        if ($currentToken) {
            $currentToken->delete();
        }

        // Mark the most recent active session for this user as revoked.
        UserSession::where('user_id', $user->id)
            ->where('revoked', false)
            ->orderByDesc('id')
            ->limit(1)
            ->update(['revoked' => true]);

        LoginHistory::create([
            'user_id' => $user->id,
            'company_id' => $user->company_id,
            'ip_address' => $request->ip(),
            'browser' => $request->header('User-Agent'),
            'success' => true,
            'reason' => 'logout',
        ]);

        $this->recordAudit($request, 'auth.logout', [
            'user_id' => $user->id,
            'company_id' => $user->company_id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->header('User-Agent'),
        ]);

        return response()->json(['message' => 'You have been securely logged out.']);
    }
}
