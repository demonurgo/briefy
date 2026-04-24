<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Client as ClientModel;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\PlanningSuggestion;
use App\Models\User;
use App\Services\Ai\MonthlyPlanGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MonthlyPlanningControllerTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $user;
    private ClientModel $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->user = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->client = ClientModel::factory()->create([
            'organization_id' => $this->org->id,
            'monthly_posts' => 5,
        ]);
    }

    public function test_generate_without_key_redirects_with_error(): void
    {
        $res = $this->actingAs($this->user)->post('/planejamento/generate', [
            'client_id' => $this->client->id, 'year' => 2026, 'month' => 5,
        ]);
        $res->assertRedirect();
        $res->assertSessionHas('error');
    }

    public function test_generate_without_quota_redirects_with_error(): void
    {
        $this->org->forceFill(['anthropic_api_key_encrypted' => 'sk-ant-' . str_repeat('a', 50)])->save();
        $this->client->update(['monthly_posts' => null]);

        $res = $this->actingAs($this->user)->post('/planejamento/generate', [
            'client_id' => $this->client->id, 'year' => 2026, 'month' => 5,
        ]);
        $res->assertRedirect();
        $res->assertSessionHas('error');
    }

    public function test_generate_creates_planning_demand_and_suggestions(): void
    {
        $this->org->forceFill(['anthropic_api_key_encrypted' => 'sk-ant-' . str_repeat('a', 50)])->save();

        $this->app->instance(MonthlyPlanGenerator::class, new class extends MonthlyPlanGenerator {
            public function __construct() {}
            public function generate($client, int $year, int $month, \App\Services\Ai\AnthropicClientInterface $anthropic): array
            {
                return [
                    'items' => array_map(fn ($i) => [
                        'date' => sprintf('%04d-%02d-%02d', $year, $month, 5 + $i * 4),
                        'title' => "Item {$i}",
                        'description' => "Descrição do item {$i} com mais de dez caracteres.",
                        'channel' => 'instagram',
                    ], range(1, $client->monthly_posts)),
                ];
            }
        });

        $res = $this->actingAs($this->user)->post('/planejamento/generate', [
            'client_id' => $this->client->id, 'year' => 2026, 'month' => 5,
        ]);

        $res->assertRedirect();
        $res->assertSessionHas('success');
        $this->assertDatabaseHas('demands', [
            'organization_id' => $this->org->id, 'client_id' => $this->client->id, 'type' => 'planning',
        ]);
        $this->assertSame(5, PlanningSuggestion::count());
    }

    public function test_convert_creates_demand_and_updates_suggestion(): void
    {
        $planningDemand = Demand::factory()->create([
            'organization_id' => $this->org->id, 'client_id' => $this->client->id, 'type' => 'planning',
        ]);
        $sugg = PlanningSuggestion::create([
            'demand_id' => $planningDemand->id, 'date' => '2026-05-10',
            'title' => 'Foo', 'description' => 'Descrição do item com mais de dez caracteres.',
            'channel' => 'instagram', 'status' => 'pending',
        ]);

        $res = $this->actingAs($this->user)->post("/planning-suggestions/{$sugg->id}/convert");

        $res->assertRedirect();
        $sugg->refresh();
        $this->assertSame('accepted', $sugg->status);
        $this->assertNotNull($sugg->converted_demand_id);
        $this->assertDatabaseHas('demands', ['id' => $sugg->converted_demand_id, 'type' => 'demand']);
    }

    public function test_convert_bulk_creates_multiple_demands(): void
    {
        $pd = Demand::factory()->create([
            'organization_id' => $this->org->id, 'client_id' => $this->client->id, 'type' => 'planning',
        ]);
        $s1 = PlanningSuggestion::create(['demand_id' => $pd->id, 'date' => '2026-05-10', 'title' => 'A', 'description' => 'Descrição longa aqui.', 'channel' => 'instagram', 'status' => 'pending']);
        $s2 = PlanningSuggestion::create(['demand_id' => $pd->id, 'date' => '2026-05-15', 'title' => 'B', 'description' => 'Descrição longa aqui.', 'channel' => 'linkedin', 'status' => 'pending']);

        $res = $this->actingAs($this->user)->post('/planning-suggestions/convert-bulk', [
            'ids' => [$s1->id, $s2->id],
        ]);

        $res->assertRedirect();
        $res->assertSessionHas('success');
        $this->assertSame('accepted', $s1->fresh()->status);
        $this->assertSame('accepted', $s2->fresh()->status);
        $this->assertSame(2, Demand::where('type', 'demand')->count());
    }

    public function test_reject_sets_status(): void
    {
        $pd = Demand::factory()->create([
            'organization_id' => $this->org->id, 'client_id' => $this->client->id, 'type' => 'planning',
        ]);
        $s = PlanningSuggestion::create([
            'demand_id' => $pd->id, 'date' => '2026-05-10', 'title' => 'x',
            'description' => 'descrição longa aqui.', 'status' => 'pending',
        ]);

        $this->actingAs($this->user)->post("/planning-suggestions/{$s->id}/reject")->assertRedirect();
        $this->assertSame('rejected', $s->fresh()->status);
    }

    public function test_cross_org_suggestion_returns_403(): void
    {
        $otherOrg = Organization::factory()->create();
        $other = User::factory()->create(['current_organization_id' => $otherOrg->id]);
        $pd = Demand::factory()->create([
            'organization_id' => $this->org->id, 'client_id' => $this->client->id, 'type' => 'planning',
        ]);
        $s = PlanningSuggestion::create([
            'demand_id' => $pd->id, 'date' => '2026-05-10', 'title' => 'x',
            'description' => 'descrição longa aqui.', 'status' => 'pending',
        ]);

        $this->actingAs($other)->post("/planning-suggestions/{$s->id}/convert")->assertStatus(403);
    }

    public function test_estimate_cost_returns_json(): void
    {
        $res = $this->actingAs($this->user)->getJson("/planejamento/estimate-cost?client_id={$this->client->id}");

        $res->assertOk();
        $res->assertJsonStructure(['cost_usd', 'model', 'monthly_posts', 'confirm_required']);
        $this->assertSame('opus', $res->json('model'));
        $this->assertSame(5, $res->json('monthly_posts'));
    }
}
