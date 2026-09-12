<?php

namespace App\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreDeveloperApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'environment' => ['required', 'in:sandbox,production'],
            'redirect_urls' => ['nullable', 'array'],
            'redirect_urls.*' => ['string', 'url', 'max:1024'],
            'allowed_ips' => ['nullable', 'array'],
            'allowed_ips.*' => ['ip'],
            'contact_email' => ['required', 'email', 'max:255'],
            'status' => ['nullable', 'in:pending,active,suspended,revoked'],
        ];
    }
}
