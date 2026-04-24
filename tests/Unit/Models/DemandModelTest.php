<?php
namespace Tests\Unit\Models;
use App\Models\Client;
use App\Models\Demand;
use App\Models\DemandComment;
use App\Models\DemandFile;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemandModelTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private Client $client;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->user = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->client = Client::factory()->create(['organization_id' => $this->org->id]);
    }

    private function makeDemand(): Demand
    {
        return Demand::factory()->create([
            'client_id' => $this->client->id,
            'organization_id' => $this->org->id,
            'created_by' => $this->user->id,
        ]);
    }

    public function test_demand_belongs_to_client(): void
    {
        $demand = $this->makeDemand();
        $this->assertSame($this->client->id, $demand->client->id);
    }

    public function test_demand_has_many_files(): void
    {
        $demand = $this->makeDemand();
        DemandFile::factory()->count(2)->create(['demand_id' => $demand->id, 'uploaded_by' => $this->user->id]);
        $this->assertCount(2, $demand->files);
    }

    public function test_demand_has_many_comments_ordered_by_created_at(): void
    {
        $demand = $this->makeDemand();
        DemandComment::factory()->create(['demand_id' => $demand->id, 'created_at' => now()->subMinutes(2)]);
        DemandComment::factory()->create(['demand_id' => $demand->id, 'created_at' => now()]);
        $comments = $demand->comments;
        $this->assertTrue($comments->first()->created_at->lt($comments->last()->created_at));
    }

    public function test_demand_ai_analysis_cast_to_array(): void
    {
        $demand = $this->makeDemand();
        $demand->update(['ai_analysis' => ['score' => 85, 'positives' => ['Boa escrita']]]);
        $this->assertIsArray($demand->fresh()->ai_analysis);
        $this->assertSame(85, $demand->fresh()->ai_analysis['score']);
    }

    public function test_deleting_demand_cascades_to_files_and_comments(): void
    {
        $demand = $this->makeDemand();
        DemandFile::factory()->create(['demand_id' => $demand->id, 'uploaded_by' => $this->user->id]);
        DemandComment::factory()->create(['demand_id' => $demand->id]);
        $demand->delete();
        $this->assertDatabaseMissing('demand_files', ['demand_id' => $demand->id]);
        $this->assertDatabaseMissing('demand_comments', ['demand_id' => $demand->id]);
    }
}
