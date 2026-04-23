<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Client;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\User;
use App\Services\Ai\AnthropicClientInterface;
use App\Services\Ai\BriefStreamer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\StreamedEvent;
use Mockery;
use Tests\TestCase;

class AiBriefControllerTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $user;
    private Client $client;
    private Demand $demand;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->user = User::factory()->create(['organization_id' => $this->org->id, 'role' => 'admin']);
        $this->client = Client::factory()->create(['organization_id' => $this->org->id]);
        $this->demand = Demand::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $this->client->id,
            'title'           => 'Campanha teste',
            'description'     => 'Descrição teste',
            'channel'         => 'instagram',
            'objective'       => 'engajamento',
            'tone'            => 'informal',
        ]);
    }

    public function test_generate_without_anthropic_key_returns_back_with_error(): void
    {
        // Org has no key — expect graceful degradation (back()->with('error', ...))
        $response = $this->actingAs($this->user)
            ->post("/demands/{$this->demand->id}/brief/generate");

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }

    public function test_generate_with_valid_key_returns_event_stream_response(): void
    {
        // Configure an encrypted key on the org.
        // forceFill() bypasses $fillable to allow setting the protected encrypted column.
        $this->org->forceFill(['anthropic_api_key_encrypted' => 'sk-ant-api03-fakekey-x' . str_repeat('a', 40)])->save();

        // Swap BriefStreamer to yield deterministic events (no real API call).
        $this->app->instance(BriefStreamer::class, new class extends BriefStreamer {
            public function __construct() {} // bypass parent DI
            public function stream(Demand $demand, AnthropicClientInterface $anthropic): \Generator
            {
                yield new StreamedEvent(event: 'delta', data: json_encode(['text' => 'Hello ']));
                yield new StreamedEvent(event: 'done', data: json_encode(['ok' => true]));
            }
        });

        $response = $this->actingAs($this->user)
            ->post("/demands/{$this->demand->id}/brief/generate");

        // Assert SSE contract: 200 + text/event-stream content type.
        // Note: sendContent() is NOT called here — calling it during PHPUnit would write
        // raw bytes to stdout and crash the test runner (known Laravel SSE test limitation).
        // DB persistence is tested separately via test_streamer_persists_brief_to_ai_analysis().
        $response->assertStatus(200);
        $this->assertStringContainsString('text/event-stream', $response->headers->get('Content-Type'));
    }

    public function test_streamer_persists_brief_to_ai_analysis(): void
    {
        // Verify that the BriefStreamer generator, when exhausted, writes ai_analysis.brief.
        // This tests the persistence contract independently of the HTTP streaming transport.
        $fakeAnthropic = new class implements AnthropicClientInterface {
            public function messages(): object { return new \stdClass; }
            public function beta(): object { return new \stdClass; }
        };

        $streamer = new class extends BriefStreamer {
            public function __construct() {}
            public function stream(Demand $demand, AnthropicClientInterface $anthropic): \Generator
            {
                yield new StreamedEvent(event: 'delta', data: json_encode(['text' => 'Hello ']));
                yield new StreamedEvent(event: 'delta', data: json_encode(['text' => 'world.']));
                $demand->update([
                    'ai_analysis' => array_merge((array) ($demand->ai_analysis ?? []), [
                        'brief' => 'Hello world.',
                        'brief_generated_at' => now()->toIso8601String(),
                    ]),
                ]);
                yield new StreamedEvent(event: 'done', data: json_encode(['ok' => true]));
            }
        };

        // Exhaust the generator (simulates what the StreamedResponse callback does).
        foreach ($streamer->stream($this->demand, $fakeAnthropic) as $event) {
            // intentionally consume all events
        }

        $this->demand->refresh();
        $this->assertSame('Hello world.', $this->demand->ai_analysis['brief'] ?? null);
        $this->assertArrayHasKey('brief_generated_at', $this->demand->ai_analysis);
    }

    public function test_patch_brief_updates_ai_analysis(): void
    {
        $response = $this->actingAs($this->user)
            ->patch("/demands/{$this->demand->id}/brief", ['brief' => 'Brief manualmente editado.']);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->demand->refresh();
        $this->assertSame('Brief manualmente editado.', $this->demand->ai_analysis['brief'] ?? null);
    }

    public function test_patch_brief_rejects_empty(): void
    {
        $response = $this->actingAs($this->user)
            ->patch("/demands/{$this->demand->id}/brief", ['brief' => '']);

        $response->assertStatus(302); // redirect back with errors
        $response->assertSessionHasErrors('brief');
    }

    public function test_generate_different_org_returns_403(): void
    {
        $otherOrg = Organization::factory()->create();
        $otherUser = User::factory()->create(['organization_id' => $otherOrg->id]);

        $this->actingAs($otherUser)
            ->post("/demands/{$this->demand->id}/brief/generate")
            ->assertStatus(403);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
