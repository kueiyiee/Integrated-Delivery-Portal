<?php

namespace App\Controllers\API\Authentication;

use App\Controllers\Controller;
use App\Models\MfaChallenge;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use OTPHP\TOTP;

class MfaController extends Controller
{
    public function setup(Request $request)
    {
        $user = $request->user();

        // generate secret
        $secret = TOTP::create()->getSecret();

        // return secret and otpauth uri for QR generation on frontend
        $totp = TOTP::create($secret);
        $totp->setLabel($user->email);
        $issuer = config('app.name');
        $totp->setIssuer($issuer);

        return response()->json([
            'secret' => $secret,
            'otpauth' => $totp->getProvisioningUri(),
        ]);
    }

    public function confirm(Request $request)
    {
        $data = $request->validate([
            'secret' => ['required', 'string'],
            'code' => ['required', 'digits:6'],
        ]);

        $user = $request->user();

        $totp = TOTP::create($data['secret']);
        if (! $totp->verify($data['code'])) {
            return response()->json(['message' => 'Invalid code'], 422);
        }

        // store secret and mark mfa enabled
        $user->mfa_secret = $data['secret'];
        $user->mfa_enabled = true;
        $user->recovery_codes = $this->generateRecoveryCodes();
        $user->save();

        return response()->json(['message' => 'MFA enabled', 'recovery_codes' => $user->recovery_codes]);
    }

    public function verify(Request $request)
    {
        $data = $request->validate([
            'challenge_token' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $challenge = MfaChallenge::where('token', $data['challenge_token'])->firstOrFail();

        if ($challenge->expires_at && now()->greaterThan($challenge->expires_at)) {
            $challenge->delete();
            return response()->json(['message' => 'Challenge expired'], 403);
        }

        $user = $challenge->user;

        if (! $user || ! $user->mfa_enabled || ! $user->mfa_secret) {
            return response()->json(['message' => 'MFA not enabled for user'], 403);
        }

        $totp = TOTP::create($user->mfa_secret);
        if ($totp->verify($data['code'])) {
            // issue token
            $token = $user->createToken('api-token')->plainTextToken;
            $challenge->delete();

            return response()->json(['token' => $token, 'user' => $user->only(['id','name','email'])]);
        }

        // check recovery codes
        $codes = $user->recovery_codes ?? [];
        if (in_array($data['code'], $codes, true)) {
            // remove used code
            $codes = array_values(array_filter($codes, fn($c) => $c !== $data['code']));
            $user->recovery_codes = $codes;
            $user->save();

            $token = $user->createToken('api-token')->plainTextToken;
            $challenge->delete();

            return response()->json(['token' => $token, 'user' => $user->only(['id','name','email'])]);
        }

        return response()->json(['message' => 'Invalid code'], 422);
    }

    public function generateRecoveryCodesEndpoint(Request $request)
    {
        $user = $request->user();

        $codes = $this->generateRecoveryCodes();
        $user->recovery_codes = $codes;
        $user->save();

        return response()->json(['recovery_codes' => $codes]);
    }

    protected function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < 10; $i++) {
            $codes[] = Str::random(10);
        }

        return $codes;
    }
}
