<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Client;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Organization $org;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->admin = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->org->users()->attach($this->admin->id, ['role' => 'admin']);
    }

    /** @test */
    public function test_demand_created_logs_activity(): void
    {
        // DASH-05: criar demanda gera registro em activity_logs
        $this->actingAs($this->admin);

        $client = Client::factory()->create(['organization_id' => $this->org->id]);
        Demand::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $client->id,
            'created_by'      => $this->admin->id,
        ]);

        $this->assertDatabaseHas('activity_logs', [
            'organization_id' => $this->org->id,
            'action_type'     => 'demand.created',
            'subject_type'    => 'demand',
        ]);
    }

    /** @test */
    public function test_demand_status_changed_logs_activity(): void
    {
        // DASH-05: mudar status gera registro em activity_logs
        $this->actingAs($this->admin);

        $client = Client::factory()->create(['organization_id' => $this->org->id]);
        $demand = Demand::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $client->id,
            'created_by'      => $this->admin->id,
            'status'          => 'todo',
        ]);

        $demand->update(['status' => 'in_progress']);

        $this->assertDatabaseHas('activity_logs', [
            'organization_id' => $this->org->id,
            'action_type'     => 'demand.status_changed',
            'subject_id'      => $demand->id,
        ]);
    }

    /** @test */
    public function test_collaborator_sees_only_own_events_in_feed(): void
    {
        // T-5-03: colaborador vê apenas eventos das suas demandas
        $collaborator = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->org->users()->attach($collaborator->id, ['role' => 'member']);

        // Criar demanda de outro usuário
        $otherUser = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->org->users()->attach($otherUser->id, ['role' => 'member']);
        $client = Client::factory()->create(['organization_id' => $this->org->id]);

        $this->actingAs($otherUser);
        Demand::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $client->id,
            'created_by'      => $otherUser->id,
            'assigned_to'     => $otherUser->id,
        ]);

        // Colaborador NÃO deve ver esse evento no feed
        $response = $this->actingAs($collaborator)
            ->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('activityFeed')
            );

        $activityFeed = $response->original->getData()['page']['props']['activityFeed'] ?? [];
        $this->assertEmpty($activityFeed, 'Collaborator should not see events of other users demands');
    }
}
