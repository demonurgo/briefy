<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamRosterTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_page_returns_members_with_pivot_data(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $admin->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);

        $this->actingAs($admin);
        $response = $this->get(route('settings.index'));
        $response->assertOk();
        $response->assertInertia(fn($page) =>
            $page->component('Settings/Index')
                ->has('members', 1)
                ->has('members.0.role')
                ->has('members.0.joined_at')
        );
    }

    public function test_admin_can_remove_collaborator(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $admin->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);
        $collab = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'collaborator']);
        $collab->organizations()->attach($org->id, ['role' => 'collaborator', 'joined_at' => now()]);

        $this->actingAs($admin);
        $response = $this->delete(route('team.remove', $collab->id));

        $response->assertRedirectContains('/settings');
        $this->assertDatabaseMissing('organization_user', [
            'user_id' => $collab->id,
            'organization_id' => $org->id,
        ]);
    }

    public function test_owner_cannot_be_removed(): void
    {
        $org = Organization::factory()->create();
        $owner = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'owner']);
        $owner->organizations()->attach($org->id, ['role' => 'owner', 'joined_at' => now()]);
        $admin = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $admin->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);

        $this->actingAs($admin);
        $response = $this->delete(route('team.remove', $owner->id));
        $response->assertForbidden();
    }
}
