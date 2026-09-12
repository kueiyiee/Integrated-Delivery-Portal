<?php

namespace App\Controllers\API\Client;

use App\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class CompanyController extends Controller
{
    public function show(): JsonResponse
    {
        $user = Auth::user();
        $company = Company::with(['adminVerifier'])->find($user->company_id);

        if (! $company) {
            return response()->json(['message' => 'Company not found.'], 404);
        }

        return response()->json(['data' => new CompanyResource($company->loadMissing('adminVerifier'))]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();
        $company = Company::find($user->company_id);

        if (! $company) {
            return response()->json(['message' => 'Company not found.'], 404);
        }

        foreach (['business_hours', 'social_links', 'metadata'] as $jsonField) {
            if ($request->has($jsonField)) {
                $value = $request->input($jsonField);
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $value = $decoded;
                    }
                }

                if (is_array($value)) {
                    foreach ($value as $key => $item) {
                        if ($item === '') {
                            $value[$key] = null;
                        }
                    }
                }

                $request->merge([$jsonField => $value]);
            }
        }

        if ($request->has('business_hours') && is_array($request->input('business_hours'))) {
            $businessHours = array_filter($request->input('business_hours'), fn($item) => $item !== null && $item !== '');
            $request->merge(['business_hours' => $businessHours]);
        }

        if ($request->has('social_links') && is_array($request->input('social_links'))) {
            $socialLinks = array_filter($request->input('social_links'), fn($item) => $item !== null && $item !== '');
            $request->merge(['social_links' => $socialLinks]);
        }

        $this->validate($request, [
            'name' => 'sometimes|required|string|max:255',
            'business_email' => 'sometimes|nullable|email:filter|max:255',
            'phone' => ['sometimes', 'nullable', 'string', 'max:20', 'regex:/^[0-9]{7,20}$/'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500', "regex:/^[A-Za-z0-9\\s,.\\-#\\/']+$/"],
            'about' => 'sometimes|nullable|string|max:2000',
            'business_hours' => 'sometimes|nullable|array',
            'business_hours.*' => ['nullable', 'string', 'max:100'],
            'social_links' => 'sometimes|nullable|array',
            'social_links.*' => ['nullable', 'string', 'max:500', 'url'],
            'business_registration_number' => 'sometimes|string|max:255|nullable',
            'industry' => 'sometimes|string|max:255|nullable',
            'country' => 'sometimes|string|max:255|nullable',
            'region' => 'sometimes|string|max:255|nullable',
            'metadata' => 'sometimes|array',
        ], [
            'name.required' => 'Company name is required.',
            'business_email.email' => 'Please enter a valid business email address.',
            'phone.regex' => 'Phone number must contain digits only (7-20 digits).',
            'address.regex' => 'Business address may only contain letters, numbers, and common address punctuation (, . - # /).',
            'about.max' => 'About Company must be 2000 characters or fewer.',
            'business_hours.*.max' => 'Each business hours entry must be 100 characters or fewer.',
            'social_links.*.url' => 'Please enter a valid URL (e.g. https://example.com).',
        ]);

        $attrs = $request->only([
            'name',
            'business_email',
            'phone',
            'address',
            'about',
            'business_registration_number',
            'industry',
            'country',
            'region',
        ]);
        $company->forceFill(array_filter($attrs, fn($v) => $v !== null));

        // JSON-ish fields may arrive as encoded strings when sent via multipart/form-data
        // (e.g. alongside a logo upload), so decode them before persisting.
        foreach (['business_hours', 'social_links'] as $jsonField) {
            if ($request->has($jsonField)) {
                $value = $request->input($jsonField);
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    $value = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
                }
                if (is_array($value)) {
                    $company->{$jsonField} = $value;
                }
            }
        }

        // Merge metadata safely
        if ($request->has('metadata') && is_array($request->input('metadata'))) {
            $company->metadata = array_merge($company->metadata ?? [], $request->input('metadata'));
        }

        $company->save();

        return response()->json(['data' => new CompanyResource($company->fresh()->loadMissing('adminVerifier'))]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'current_password' => 'required|string',
            'password' => 'required|string|confirmed|min:8',
            'password_confirmation' => 'required|string',
        ]);

        $user = Auth::user();
        if (! $user instanceof \App\Models\User) {
            return response()->json(['message' => 'Authenticated user not found.'], 401);
        }

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'The current password provided does not match our records. Please verify and try again.',
            ], 422);
        }

        $user->password = Hash::make($data['password']);
        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'last_password_changed_at')) {
            $user->last_password_changed_at = now();
        }
        $user->save();

        return response()->json(['message' => 'Your password has been updated successfully.']);
    }
}
