<?php
namespace Tests\Unit\Models;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_locale_returns_user_preference(): void
    {
        $user = User::factory()->create(['preferences' => ['locale' => 'en', 'theme' => 'light']]);
        $this->assertSame('en', $user->getLocale());
    }

    public function test_get_locale_defaults_to_pt_br_when_preference_missing(): void
    {
        $user = User::factory()->create(['preferences' => []]);
        $this->assertSame('pt-BR', $user->getLocale());
    }

    public function test_get_theme_returns_user_preference(): void
    {
        $user = User::factory()->create(['preferences' => ['locale' => 'pt-BR', 'theme' => 'dark']]);
        $this->assertSame('dark', $user->getTheme());
    }

    public function test_get_theme_defaults_to_light_when_preference_missing(): void
    {
        $user = User::factory()->create(['preferences' => []]);
        $this->assertSame('light', $user->getTheme());
    }

    public function test_is_admin_returns_true_for_admin_role(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $this->assertTrue($user->isAdmin());
    }

    public function test_is_admin_returns_false_for_collaborator_role(): void
    {
        $user = User::factory()->create(['role' => 'collaborator']);
        $this->assertFalse($user->isAdmin());
    }

    public function test_user_belongs_to_organization(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['organization_id' => $org->id]);
        $this->assertInstanceOf(Organization::class, $user->organization);
        $this->assertSame($org->id, $user->organization->id);
    }
}
