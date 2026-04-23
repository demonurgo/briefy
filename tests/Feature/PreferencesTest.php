<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PreferencesTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function test_onboarding_dismissed_persists(): void
    {
        // ONBRD-02 + T-5-02: onboarding_dismissed deve ser salvo nas preferences
        // (BLOCKER-02: rota preferences filtrava apenas locale e theme)
        $org = Organization::factory()->create();
        $user = User::factory()->create([
            'current_organization_id' => $org->id,
            'preferences' => [],
        ]);
        $org->users()->attach($user->id, ['role' => 'member']);

        $this->actingAs($user)
            ->patch('/settings/preferences', ['onboarding_dismissed' => true])
            ->assertRedirect();

        $user->refresh();
        $this->assertTrue(
            (bool) ($user->preferences['onboarding_dismissed'] ?? false),
            'onboarding_dismissed deve ser persistido em preferences'
        );
    }
}
