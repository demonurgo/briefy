<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $collaborator;
    private Organization $org;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::factory()->create();
        $this->admin = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->org->users()->attach($this->admin->id, ['role' => 'admin']);

        $this->collaborator = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->org->users()->attach($this->collaborator->id, ['role' => 'member']);
    }

    /** @test */
    public function test_admin_sees_overview_props(): void
    {
        // T-5-01: admin deve receber prop 'overview' com statusBreakdown
        $this->actingAs($this->admin)
            ->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('overview')
                ->has('overview.statusBreakdown')
            );
    }

    /** @test */
    public function test_collaborator_cannot_see_overview_props(): void
    {
        // T-5-01: colaborador NÃO deve receber overview (null ou ausente)
        $this->actingAs($this->collaborator)
            ->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('overview', null)
            );
    }

    /** @test */
    public function test_collaborator_sees_personal_props(): void
    {
        // DASH-04: colaborador vê resumo das próprias demandas
        $this->actingAs($this->collaborator)
            ->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('personal')
                ->has('personal.statusCounts')
                ->has('personal.focusDemands')
            );
    }

    /** @test */
    public function test_admin_sees_team_workload(): void
    {
        // DASH-02: admin vê workload de membros
        $this->actingAs($this->admin)
            ->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('overview.teamWorkload')
            );
    }

    /** @test */
    public function test_admin_sees_client_distribution(): void
    {
        // DASH-03: admin vê demandas por cliente
        $this->actingAs($this->admin)
            ->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('overview.clientDistribution')
            );
    }

    /** @test */
    public function test_onboarding_props(): void
    {
        // ONBRD-01: props hasClients e hasDemands presentes
        $this->actingAs($this->collaborator)
            ->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('hasClients')
                ->has('hasDemands')
            );
    }
}
