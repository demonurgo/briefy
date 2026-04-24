<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_creates_org_and_attaches_owner(): void
    {
        $existingOrg = Organization::factory()->create();
        $user = User::factory()->create([
            'current_organization_id' => $existingOrg->id,
        ]);
        $user->organizations()->attach($existingOrg->id, [
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        $this->actingAs($user);

        $response = $this->post(route('organizations.store'), [
            'name' => 'Nova Agência',
            'slug' => 'nova-agencia',
        ]);

        $response->assertRedirect(route('dashboard'));
        $this->assertDatabaseHas('organizations', ['slug' => 'nova-agencia', 'name' => 'Nova Agência']);
        $this->assertDatabaseHas('organization_user', [
            'user_id' => $user->id,
            'role'    => 'owner',
        ]);
        $user->refresh();
        $this->assertEquals('nova-agencia', $user->currentOrganization->slug);
    }

    public function test_store_rejects_duplicate_slug(): void
    {
        Organization::factory()->create(['slug' => 'already-taken']);

        $existingOrg = Organization::factory()->create();
        $user = User::factory()->create([
            'current_organization_id' => $existingOrg->id,
        ]);
        $user->organizations()->attach($existingOrg->id, [
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        $this->actingAs($user);

        $response = $this->post(route('organizations.store'), [
            'name' => 'Qualquer Nome',
            'slug' => 'already-taken',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['slug']);
    }

    public function test_store_requires_authentication(): void
    {
        $response = $this->post(route('organizations.store'), [
            'name' => 'Nova Agência',
            'slug' => 'nova-agencia',
        ]);

        $response->assertRedirect('/login');
    }

    public function test_store_requires_name(): void
    {
        $existingOrg = Organization::factory()->create();
        $user = User::factory()->create([
            'current_organization_id' => $existingOrg->id,
        ]);
        $user->organizations()->attach($existingOrg->id, [
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        $this->actingAs($user);

        $response = $this->post(route('organizations.store'), [
            'slug' => 'sem-nome',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }
}
