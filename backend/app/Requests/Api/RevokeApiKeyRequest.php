<?php

namespace App\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class RevokeApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
