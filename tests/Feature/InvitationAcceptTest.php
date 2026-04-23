<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class InvitationAcceptTest extends TestCase
{
    use RefreshDatabase;

    private function makeInvitation(string $email = 'invited@example.com'): Invitation
    {
        $org = Organization::factory()->create(['name' => 'Test Agency']);
        $admin = User::factory()->create(['current_organization_id' => $org->id]);
        $admin->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);
        return Invitation::create([
            'organization_id' => $org->id,
            'invited_by' => $admin->id,
            'email' => $email,
            'role' => 'collaborator',
            'token' => (string) Str::uuid(),
            'expires_at' => now()->addDays(7),
        ]);
    }

    public function test_valid_token_shows_accept_page(): void
    {
        $invite = $this->makeInvitation();
        $response = $this->get(route('invitations.show', $invite->token));
        $response->assertOk();
        $response->assertInertia(fn($page) => $page->component('Invite/Accept'));
    }

    public function test_expired_token_shows_error(): void
    {
        $invite = $this->makeInvitation();
        $invite->update(['expires_at' => now()->subDay()]);
        $response = $this->get(route('invitations.show', $invite->token));
        $response->assertOk();
        $response->assertInertia(fn($page) =>
            $page->component('Invite/Accept')->where('expired', true)
        );
    }

    public function test_new_user_can_accept_invite_and_joins_org(): void
    {
        $invite = $this->makeInvitation('newbie@example.com');
        $response = $this->post(route('invitations.store', $invite->token), [
            'name' => 'New User',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertRedirect(route('dashboard'));
        $this->assertDatabaseHas('users', ['email' => 'newbie@example.com']);
        $user = User::where('email', 'newbie@example.com')->first();
        $this->assertDatabaseHas('organization_user', [
            'user_id' => $user->id,
            'organization_id' => $invite->organization_id,
            'role' => 'collaborator',
        ]);
        $this->assertNotNull(Invitation::find($invite->id)->accepted_at);
    }

    public function test_existing_user_accepts_invite_and_joins_second_org(): void
    {
        $existing = User::factory()->create(['email' => 'existing@example.com']);
        $orgA = Organization::factory()->create();
        $existing->organizations()->attach($orgA->id, ['role' => 'admin', 'joined_at' => now()]);
        $existing->update(['current_organization_id' => $orgA->id]);

        $invite = $this->makeInvitation('existing@example.com');

        $response = $this->post(route('invitations.store', $invite->token));
        $response->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('organization_user', [
            'user_id' => $existing->id,
            'organization_id' => $invite->organization_id,
        ]);
        $existing->refresh();
        $this->assertEquals($invite->organization_id, $existing->current_organization_id);
    }
}
