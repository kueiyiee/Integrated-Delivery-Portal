<?php

namespace App\Requests\Delivery;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DeliveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tracking_number' => ['prohibited'],
            'external_reference' => ['nullable', 'string', 'max:120'],
            'pickup_address' => ['required', 'array'],
            'pickup_address.line1' => ['required', 'string', 'max:255'],
            'pickup_address.latitude' => ['nullable', 'numeric'],
            'pickup_address.longitude' => ['nullable', 'numeric'],
            'dropoff_address' => ['required', 'array'],
            'dropoff_address.line1' => ['required', 'string', 'max:255'],
            'dropoff_address.latitude' => ['nullable', 'numeric'],
            'dropoff_address.longitude' => ['nullable', 'numeric'],
            'package' => ['sometimes', 'array'],
            'package.type' => ['sometimes', 'string', Rule::in(['document', 'parcel', 'box', 'other'])],
            'package.description' => ['sometimes', 'string', 'max:255'],
            'package.quantity' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'package.weight' => ['nullable', 'numeric', 'gt:0', 'max:10000', 'required_with:package.weight_unit'],
            'package.weight_unit' => ['nullable', 'string', Rule::in(['kg', 'g']), 'required_with:package.weight'],
            'package.special_handling' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'scheduled_at' => ['nullable', 'date'],
            'status' => ['nullable', 'string', Rule::in([
                'pending',
                'assigned',
                'in_transit',
                'picked_up',
                'delivered',
                'cancelled',
                'failed',
            ])],
        ];
    }
}
