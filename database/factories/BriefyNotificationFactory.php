<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Database\Factories;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BriefyNotificationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'user_id'         => User::factory(),
            'type'            => 'demand_assigned',
            'title'           => $this->faker->sentence(4),
            'body'            => $this->faker->sentence(6),
            'data'            => ['demand_id' => $this->faker->randomNumber(3), 'demand_title' => $this->faker->sentence(3)],
            'read_at'         => null,
        ];
    }
}
