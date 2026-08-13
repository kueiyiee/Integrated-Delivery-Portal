<?php

namespace App\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class RotateApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:255'],
        ];
    }
}
