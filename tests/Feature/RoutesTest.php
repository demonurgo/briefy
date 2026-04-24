<?php
namespace Tests\Feature;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoutesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::factory()->create();
        $this->user = User::factory()->create(['current_organization_id' => $org->id]);
        $this->user->organizations()->attach($org->id, ['role' => 'owner', 'joined_at' => now()]);
    }

    public function test_dashboard_redirects_unauthenticated_users_to_login(): void
    {
        $this->get('/dashboard')->assertRedirect(route('login'));
    }

    public function test_root_redirects_to_dashboard(): void
    {
        $this->actingAs($this->user)->get('/')->assertRedirect('/dashboard');
    }

    public function test_authenticated_user_can_access_dashboard(): void
    {
        $this->actingAs($this->user)->get('/dashboard')->assertStatus(200);
    }

    public function test_authenticated_user_can_access_clients(): void
    {
        $this->actingAs($this->user)->get('/clients')->assertStatus(200);
    }

    public function test_authenticated_user_can_access_demands(): void
    {
        $this->actingAs($this->user)->get('/demands')->assertStatus(200);
    }

    public function test_authenticated_user_can_access_planning(): void
    {
        $this->actingAs($this->user)->get('/planejamento')->assertStatus(200);
    }

    public function test_authenticated_user_can_access_settings(): void
    {
        $this->actingAs($this->user)->get('/settings')->assertStatus(200);
    }

    public function test_unauthenticated_user_cannot_access_protected_routes(): void
    {
        foreach (['/dashboard', '/clients', '/demands', '/planning', '/settings'] as $route) {
            $this->get($route)->assertRedirect(route('login'));
        }
    }
}
