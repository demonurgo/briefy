<?php
namespace Tests\Feature\Settings;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PreferencesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::factory()->create();
        $this->user = User::factory()->create(['organization_id' => $org->id, 'preferences' => ['locale' => 'pt-BR', 'theme' => 'light']]);
    }

    public function test_user_can_update_theme_to_dark(): void
    {
        $this->actingAs($this->user)->patch(route('settings.preferences'), ['theme' => 'dark'])->assertRedirect();
        $this->assertSame('dark', $this->user->fresh()->preferences['theme']);
    }

    public function test_user_can_update_locale_to_english(): void
    {
        $this->actingAs($this->user)->patch(route('settings.preferences'), ['locale' => 'en'])->assertRedirect();
        $this->assertSame('en', $this->user->fresh()->preferences['locale']);
    }

    public function test_updating_theme_preserves_existing_locale(): void
    {
        $this->actingAs($this->user)->patch(route('settings.preferences'), ['theme' => 'dark']);
        $this->assertSame('pt-BR', $this->user->fresh()->preferences['locale']);
    }

    public function test_unauthenticated_user_cannot_update_preferences(): void
    {
        $this->patch(route('settings.preferences'), ['theme' => 'dark'])->assertRedirect(route('login'));
    }
}
