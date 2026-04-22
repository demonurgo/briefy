<?php
namespace Tests\Feature\Auth;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_renders(): void
    {
        $this->get('/login')->assertStatus(200);
    }

    public function test_users_can_authenticate_and_last_login_is_updated(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['organization_id' => $org->id, 'last_login_at' => null]);
        $this->post('/login', ['email' => $user->email, 'password' => 'password']);
        $this->assertAuthenticated();
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_users_cannot_authenticate_with_invalid_password(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['organization_id' => $org->id]);
        $this->post('/login', ['email' => $user->email, 'password' => 'wrong-password']);
        $this->assertGuest();
    }

    public function test_users_cannot_authenticate_with_nonexistent_email(): void
    {
        $this->post('/login', ['email' => 'nobody@example.com', 'password' => 'password']);
        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['organization_id' => $org->id]);
        $this->actingAs($user)->post('/logout');
        $this->assertGuest();
    }
}
