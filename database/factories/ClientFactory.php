<?php
namespace Database\Factories;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => $this->faker->company(),
            'segment' => $this->faker->randomElement(['tech', 'food', 'fashion', 'health']),
            'channels' => ['instagram', 'linkedin'],
            'tone_of_voice' => null,
            'target_audience' => null,
            'brand_references' => null,
            'briefing' => null,
            'avatar' => null,
        ];
    }
}
