<?php

namespace App\Requests\Authentication;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email:filter',
                'max:255',
                function ($attribute, $value, $fail) {
                    $normalizedEmail = User::normalizeEmail($value);

                    if (User::where('email', $normalizedEmail)->exists()) {
                        $fail('That email address is already registered. Please use a different email or sign in if you already have an account.');
                        return;
                    }

                    $existingCompany = Company::where('business_email', $normalizedEmail)->orderByDesc('id')->first();
                    if ($existingCompany && $existingCompany->deletion_type !== Company::DELETION_TYPE_AUTO) {
                        $companyName = trim((string) $this->input('company_name'));
                        if (strcasecmp($existingCompany->name, $companyName) === 0) {
                            $fail('A company with this name and email already exists.');
                        } else {
                            $fail('A company with this email already exists.');
                        }
                    }
                },
            ],
            'password' => ['required', 'string', 'confirmed', 'min:4'],
            'password_confirmation' => ['required', 'string', 'min:4'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'That email address is already registered. Please use a different email or sign in if you already have an account.',
            'password.confirmed' => 'Passwords must match.',
            'company_name.required' => 'Company name is required.',
        ];
    }
}
