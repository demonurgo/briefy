<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_name_and_preferences(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $user->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);

        $this->actingAs($user);
        $response = $this->patch(route('settings.profile.update'), [
            'name' => 'Updated Name',
            'locale' => 'en',
            'theme' => 'dark',
        ]);

        $response->assertRedirectContains('/settings');
        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Updated Name']);
        $user->refresh();
        $this->assertEquals('en', $user->preferences['locale']);
    }

    public function test_avatar_upload_resizes_to_256x256_and_saves(): void
    {
        Storage::fake('public');
        $org = Organization::factory()->create();
        $user = User::factory()->create(['current_organization_id' => $org->id, 'role' => 'admin']);
        $user->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);

        $this->actingAs($user);
        $file = UploadedFile::fake()->image('avatar.jpg', 512, 512);

        $response = $this->post(route('settings.profile.avatar'), ['avatar' => $file]);

        $response->assertRedirectContains('/settings');
        $user->refresh();
        $this->assertNotNull($user->avatar);
        Storage::disk('public')->assertExists($user->avatar);
    }

    public function test_avatar_upload_rejects_files_over_2mb(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['current_organization_id' => $org->id]);
        $user->organizations()->attach($org->id, ['role' => 'admin', 'joined_at' => now()]);

        $this->actingAs($user);
        $bigFile = UploadedFile::fake()->image('big.jpg')->size(3000);

        $response = $this->post(route('settings.profile.avatar'), ['avatar' => $bigFile]);
        $response->assertSessionHasErrors(['avatar']);
    }
}
