<?php

namespace Database\Factories;

use App\Models\Delivery;
use Illuminate\Database\Eloquent\Factories\Factory;

class DeliveryFactory extends Factory
{
    protected $model = Delivery::class;

    public function definition(): array
    {
        return [
            'company_id' => 1,
            'uuid' => $this->faker->uuid(),
            'tracking_number' => strtoupper($this->faker->bothify('TRK-######')),
            'external_reference' => $this->faker->optional()->word(),
            'status' => 'pending',
        ];
    }
}
