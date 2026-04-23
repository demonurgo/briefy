<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnsureRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_collaborator_gets_403_on_invite_route(): void
    {
        $org = Organization::factory()->create();
        $collab = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'collaborator']);
        $collab->organizations()->attach($org->id, ['role' => 'collaborator', 'joined_at' => now()]);

        $this->actingAs($collab);
        $response = $this->post(route('team.invite'), ['email' => 'x@x.com', 'role' => 'collaborator']);
        $response->assertForbidden();
    }

    public function test_collaborator_gets_403_on_member_remove_route(): void
    {
        $org = Organization::factory()->create();
        $collab = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'collaborator']);
        $collab->organizations()->attach($org->id, ['role' => 'collaborator', 'joined_at' => now()]);
        $target = User::factory()->create(['current_organization_id' => $org->id]);
        $target->organizations()->attach($org->id, ['role' => 'collaborator', 'joined_at' => now()]);

        $this->actingAs($collab);
        $response = $this->delete(route('team.remove', $target->id));
        $response->assertForbidden();
    }

    public function test_admin_can_access_invite_route(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $admin->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);

        $this->actingAs($admin);
        $response = $this->post(route('team.invite'), ['email' => 'valid@example.com', 'role' => 'collaborator']);
        // Not forbidden (may redirect or return errors but not 403)
        $response->assertStatus(302);
    }
}
