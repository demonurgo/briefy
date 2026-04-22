<?php
namespace Database\Factories;
use App\Models\Demand;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DemandCommentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'demand_id' => Demand::factory(),
            'user_id' => User::factory(),
            'body' => $this->faker->paragraph(),
            'source' => 'user',
        ];
    }
}
