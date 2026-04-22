<?php
namespace Tests\Unit\Models;
use App\Models\Client;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_organization_has_many_users(): void
    {
        $org = Organization::factory()->create();
        User::factory()->count(3)->create(['organization_id' => $org->id]);
        $this->assertCount(3, $org->users);
    }

    public function test_organization_has_many_clients(): void
    {
        $org = Organization::factory()->create();
        Client::factory()->count(2)->create(['organization_id' => $org->id]);
        $this->assertCount(2, $org->clients);
    }

    public function test_organization_settings_cast_to_array(): void
    {
        $org = Organization::factory()->create(['settings' => ['auto_analyze_deliverable' => true]]);
        $this->assertIsArray($org->settings);
        $this->assertTrue($org->settings['auto_analyze_deliverable']);
    }

    public function test_deleting_organization_cascades_to_clients(): void
    {
        $org = Organization::factory()->create();
        Client::factory()->create(['organization_id' => $org->id]);
        $org->delete();
        $this->assertDatabaseMissing('clients', ['organization_id' => $org->id]);
    }
}
