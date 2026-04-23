<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_index_returns_200(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $user->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);

        $this->actingAs($user);
        $response = $this->get(route('settings.index'));
        $response->assertOk();
        $response->assertInertia(fn($page) => $page->component('Settings/Index'));
    }

    public function test_settings_ai_redirects_to_settings_hash_ai(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $user->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);

        $this->actingAs($user);
        $response = $this->get(route('settings.ai.edit'));
        $response->assertRedirect('/settings#ai');
    }

    public function test_org_switcher_updates_current_organization(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();
        $user = User::factory()->create(['current_organization_id' => $org1->id, 'role' => 'admin']);
        $user->organizations()->attach($org1->id, ['role' => 'admin', 'joined_at' => now()]);
        $user->organizations()->attach($org2->id, ['role' => 'collaborator', 'joined_at' => now()]);

        $this->actingAs($user);
        $response = $this->patch(route('settings.current-org'), ['organization_id' => $org2->id]);
        $response->assertRedirect();

        $user->refresh();
        $this->assertEquals($org2->id, $user->current_organization_id);
    }
}
