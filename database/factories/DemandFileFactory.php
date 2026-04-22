<?php
namespace Database\Factories;
use App\Models\Demand;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DemandFileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'demand_id' => Demand::factory(),
            'type' => 'link',
            'name' => $this->faker->word() . '.pdf',
            'path_or_url' => $this->faker->url(),
            'uploaded_by' => User::factory(),
        ];
    }
}
