<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class InvitationControllerTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdminUser(): array
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $admin->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);
        return [$org, $admin];
    }

    public function test_admin_can_invite_by_email(): void
    {
        [$org, $admin] = $this->makeAdminUser();
        $this->actingAs($admin);

        $response = $this->post(route('team.invite'), [
            'email' => 'newuser@example.com',
            'role' => 'collaborator',
        ]);

        $response->assertRedirectContains('/settings');
        $this->assertDatabaseHas('invitations', [
            'organization_id' => $org->id,
            'email' => 'newuser@example.com',
            'role' => 'collaborator',
        ]);
    }

    public function test_invitation_has_uuid_token_and_7_day_expiry(): void
    {
        [$org, $admin] = $this->makeAdminUser();
        $this->actingAs($admin);

        $this->post(route('team.invite'), ['email' => 'test@example.com', 'role' => 'admin']);

        $invite = Invitation::where('email', 'test@example.com')->first();
        $this->assertNotNull($invite);
        $this->assertTrue(Str::isUuid($invite->token));
        $this->assertTrue($invite->expires_at->greaterThan(now()->addDays(6)));
    }

    public function test_collaborator_cannot_invite(): void
    {
        $org = Organization::factory()->create();
        $collab = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'collaborator']);
        $collab->organizations()->attach($org->id, ['role' => 'collaborator', 'joined_at' => now()]);
        $this->actingAs($collab);

        $response = $this->post(route('team.invite'), ['email' => 'x@x.com', 'role' => 'collaborator']);
        $response->assertForbidden();
    }

    public function test_admin_can_cancel_pending_invite(): void
    {
        [$org, $admin] = $this->makeAdminUser();
        $invite = Invitation::create([
            'organization_id' => $org->id,
            'invited_by' => $admin->id,
            'email' => 'pending@example.com',
            'role' => 'collaborator',
            'token' => (string) Str::uuid(),
            'expires_at' => now()->addDays(7),
        ]);
        $this->actingAs($admin);

        $response = $this->delete(route('team.invitation.cancel', $invite->id));

        $response->assertRedirectContains('/settings');
        $this->assertDatabaseMissing('invitations', ['id' => $invite->id]);
    }

    public function test_cannot_invite_email_already_member(): void
    {
        [$org, $admin] = $this->makeAdminUser();
        $existing = User::factory()->create(['current_organization_id' => $org->id]);
        $existing->organizations()->attach($org->id, ['role' => 'collaborator', 'joined_at' => now()]);
        $this->actingAs($admin);

        $response = $this->post(route('team.invite'), ['email' => $existing->email, 'role' => 'collaborator']);
        $response->assertSessionHasErrors(['email']);
    }
}
