<?php
namespace Database\Factories;
use App\Models\Client;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DemandFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'client_id' => Client::factory(),
            'type' => 'demand',
            'title' => $this->faker->sentence(4),
            'description' => null,
            'objective' => null,
            'tone' => null,
            'channel' => null,
            'deadline' => $this->faker->optional()->dateTimeBetween('now', '+30 days'),
            'status' => 'todo',
            'recurrence_day' => null,
            'ai_analysis' => null,
            'created_by' => User::factory(),
            'assigned_to' => null,
        ];
    }
}
