<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Events\DemandAssigned;
use App\Events\DemandStatusChanged;
use App\Models\Client;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class DemandLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $user;
    private Client $client;
    private Demand $demand;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org    = Organization::factory()->create();
        $this->user   = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->client = Client::factory()->create(['organization_id' => $this->org->id]);
        $this->demand = Demand::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $this->client->id,
            'created_by'      => $this->user->id,
        ]);
        // MANDATORY: attach pivot row so isAdminOrOwner() returns true for $this->user
        $this->user->organizations()->attach($this->org->id, ['role' => 'owner', 'joined_at' => now()]);
    }

    // -------------------------------------------------------------------------
    // Happy path: create
    // TEST-03 — DemandController::store (POST /clients/{client}/demands)
    // -------------------------------------------------------------------------

    public function test_owner_can_create_demand(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('clients.demands.store', $this->client), [
                'title'  => 'Nova demanda de teste',
                'status' => 'todo',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('demands', [
            'organization_id' => $this->org->id,
            'client_id'       => $this->client->id,
            'title'           => 'Nova demanda de teste',
            'created_by'      => $this->user->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // Happy path: status update
    // TEST-03 — DemandController::updateStatus (PATCH /demands/{demand}/status)
    // -------------------------------------------------------------------------

    public function test_owner_can_update_status(): void
    {
        Event::fake([DemandStatusChanged::class]);

        $this->actingAs($this->user)
            ->patch(route('demands.status.update', $this->demand), ['status' => 'in_progress'])
            ->assertRedirect();

        $this->assertDatabaseHas('demands', [
            'id'     => $this->demand->id,
            'status' => 'in_progress',
        ]);
    }

    // -------------------------------------------------------------------------
    // Happy path: assign
    // TEST-03 — DemandController::updateInline (PUT /demands/{demand}/inline)
    // -------------------------------------------------------------------------

    public function test_owner_can_assign_demand(): void
    {
        Event::fake([DemandAssigned::class]);

        $assignee = User::factory()->create(['current_organization_id' => $this->org->id]);

        $this->actingAs($this->user)
            ->put(route('demands.inline.update', $this->demand), [
                'title'       => $this->demand->title,
                'assigned_to' => $assignee->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('demands', [
            'id'          => $this->demand->id,
            'assigned_to' => $assignee->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // Happy path: archive
    // TEST-03 — ArchiveController::archive (POST /demands/{demand}/archive)
    // -------------------------------------------------------------------------

    public function test_owner_can_archive_demand(): void
    {
        $this->actingAs($this->user)
            ->post(route('demands.archive', $this->demand))
            ->assertRedirect();

        $this->assertNotNull($this->demand->fresh()->archived_at);
    }

    // -------------------------------------------------------------------------
    // Happy path: unarchive
    // TEST-03 — ArchiveController::unarchive (POST /demands/{demand}/unarchive)
    // -------------------------------------------------------------------------

    public function test_owner_can_unarchive_demand(): void
    {
        $this->demand->update(['archived_at' => now()]);

        $this->actingAs($this->user)
            ->post(route('demands.unarchive', $this->demand))
            ->assertRedirect();

        $this->assertNull($this->demand->fresh()->archived_at);
    }

    // -------------------------------------------------------------------------
    // Happy path: trash + restore
    // TEST-03 — TrashController::trash + TrashController::restore
    // Note: restore route uses raw int {id}, NOT model binding
    // -------------------------------------------------------------------------

    public function test_owner_can_trash_and_restore_demand(): void
    {
        $this->actingAs($this->user)
            ->post(route('demands.trash', $this->demand))
            ->assertRedirect();

        $this->assertSoftDeleted('demands', ['id' => $this->demand->id]);

        $this->actingAs($this->user)
            ->post(route('trash.restore', $this->demand->id))
            ->assertRedirect();

        $this->assertNotSoftDeleted('demands', ['id' => $this->demand->id]);
    }

    // -------------------------------------------------------------------------
    // RBAC: unauthenticated redirect
    // TEST-03 D-04 — auth middleware on demands.index
    // -------------------------------------------------------------------------

    public function test_unauthenticated_cannot_access_demands(): void
    {
        $this->get(route('demands.index'))->assertRedirect('/login');
    }

    // -------------------------------------------------------------------------
    // RBAC: cross-org 403
    // TEST-03 D-04 — DemandController::authorizeDemand() line 352
    // -------------------------------------------------------------------------

    public function test_cross_org_user_cannot_access_demand(): void
    {
        $otherOrg  = Organization::factory()->create();
        $otherUser = User::factory()->create(['current_organization_id' => $otherOrg->id]);
        $otherUser->organizations()->attach($otherOrg->id, ['role' => 'owner', 'joined_at' => now()]);

        $this->actingAs($otherUser)
            ->patch(route('demands.status.update', $this->demand), ['status' => 'in_progress'])
            ->assertForbidden();
    }

    // -------------------------------------------------------------------------
    // RBAC: collaborator cannot trash others' demand
    // TEST-03 D-04 — TrashController::trash lines 47–49
    // -------------------------------------------------------------------------

    public function test_collaborator_cannot_trash_others_demand(): void
    {
        $collab = User::factory()->create(['current_organization_id' => $this->org->id]);
        $collab->organizations()->attach($this->org->id, ['role' => 'collaborator', 'joined_at' => now()]);

        // $this->demand was created by $this->user (owner), not $collab
        $this->actingAs($collab)
            ->post(route('demands.trash', $this->demand))
            ->assertForbidden();
    }
}
