<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_change_collaborator_to_admin(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $admin->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);
        $collab = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'collaborator']);
        $collab->organizations()->attach($org->id, ['role' => 'collaborator', 'joined_at' => now()]);

        $this->actingAs($admin);
        $response = $this->from(route('settings.index'))->patch(route('team.updateRole', $collab->id), ['role' => 'admin']);
        $response->assertRedirectContains('/settings');

        $this->assertDatabaseHas('organization_user', [
            'user_id' => $collab->id,
            'organization_id' => $org->id,
            'role' => 'admin',
        ]);
    }

    public function test_owner_cannot_be_demoted(): void
    {
        $org = Organization::factory()->create();
        $owner = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'owner']);
        $owner->organizations()->attach($org->id, ['role' => 'owner', 'joined_at' => now()]);
        $admin = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $admin->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);

        $this->actingAs($admin);
        $response = $this->patch(route('team.updateRole', $owner->id), ['role' => 'collaborator']);
        $response->assertForbidden();
    }

    public function test_collaborator_cannot_change_roles(): void
    {
        $org = Organization::factory()->create();
        $collab = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'collaborator']);
        $collab->organizations()->attach($org->id, ['role' => 'collaborator', 'joined_at' => now()]);
        $target = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'collaborator']);
        $target->organizations()->attach($org->id, ['role' => 'collaborator', 'joined_at' => now()]);

        $this->actingAs($collab);
        $response = $this->patch(route('team.updateRole', $target->id), ['role' => 'admin']);
        $response->assertForbidden();
    }
}
