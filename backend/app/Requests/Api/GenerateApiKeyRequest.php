<?php

namespace App\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class GenerateApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'environment' => ['nullable', 'string', 'in:production,test'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'max:255'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ];
    }
}
