<?php
namespace Tests\Feature\Auth;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_renders(): void
    {
        $this->get('/register')->assertStatus(200);
    }

    public function test_new_users_can_register_and_organization_is_created(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);
        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard'));
        $user = User::where('email', 'test@example.com')->first();
        $this->assertNotNull($user->current_organization_id);
        $this->assertSame('owner', $user->role);
        // Verify pivot row was created
        $this->assertDatabaseHas('organization_user', [
            'user_id'         => $user->id,
            'organization_id' => $user->current_organization_id,
            'role'            => 'owner',
        ]);
        $org = Organization::find($user->current_organization_id);
        $this->assertArrayHasKey('auto_analyze_deliverable', $org->settings);
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);
        $this->post('/register', ['name' => 'Another', 'email' => 'taken@example.com', 'password' => 'password', 'password_confirmation' => 'password'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_registration_fails_with_mismatched_passwords(): void
    {
        $this->post('/register', ['name' => 'Test', 'email' => 'test@example.com', 'password' => 'password', 'password_confirmation' => 'different'])
            ->assertSessionHasErrors('password');
        $this->assertGuest();
    }

    public function test_registration_fails_with_missing_name(): void
    {
        $this->post('/register', ['name' => '', 'email' => 'test@example.com', 'password' => 'password', 'password_confirmation' => 'password'])
            ->assertSessionHasErrors('name');
        $this->assertGuest();
    }

    public function test_registration_fails_with_invalid_email(): void
    {
        $this->post('/register', ['name' => 'Test', 'email' => 'not-an-email', 'password' => 'password', 'password_confirmation' => 'password'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }
}
