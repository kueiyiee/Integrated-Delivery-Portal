<?php

namespace App\Requests\Authentication;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        // Log raw input and headers for debugging JSON vs form payload issues
        try {
            Log::info('LoginRequest@prepareForValidation input', ['all' => $this->all(), 'json' => $this->json()->all(), 'headers' => $this->headers->all()]);
        } catch (\Throwable $e) {
            // swallow logging errors to avoid blocking validation
        }
    }
}
