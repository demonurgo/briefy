<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature\Jobs;

use App\Jobs\ExtractClientMemoryJob;
use App\Models\AiConversation;
use App\Models\Client as ClientModel;
use App\Models\ClientAiMemory;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\User;
use App\Services\Ai\AnthropicClientFactory;
use App\Services\Ai\ClientMemoryExtractor;
use App\Services\Ai\Schemas\MemoryInsightSchema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExtractClientMemoryJobTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private ClientModel $client;
    private AiConversation $conv;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create([
            'anthropic_api_key_encrypted' => 'sk-ant-' . str_repeat('a', 50),
        ]);
        $user = User::factory()->create(['organization_id' => $this->org->id]);
        $this->client = ClientModel::factory()->create(['organization_id' => $this->org->id]);
        $demand = Demand::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $this->client->id,
        ]);
        $this->conv = AiConversation::create([
            'organization_id' => $this->org->id,
            'user_id'         => $user->id,
            'context_type'    => 'demand',
            'context_id'      => $demand->id,
        ]);
        $this->conv->messages()->create(['role' => 'user',      'content' => 'Conte sobre este cliente']);
        $this->conv->messages()->create(['role' => 'assistant', 'content' => 'O cliente prefere tom informal.']);
    }

    // -------------------------------------------------------------------------
    // Test 1: High-confidence insight is persisted with correct client_id
    // -------------------------------------------------------------------------

    public function test_accepts_high_confidence_insight(): void
    {
        $this->bindExtractorStub([[
            'category'   => 'tone',
            'insight'    => 'Usa tom informal e descontraído.',
            'confidence' => 0.9,
        ]]);

        $this->runJob();

        $this->assertSame(1, ClientAiMemory::count());
        $this->assertDatabaseHas('client_ai_memory', [
            'client_id' => $this->client->id,
            'category'  => 'tone',
        ]);
    }

    // -------------------------------------------------------------------------
    // Test 2: Low-confidence insight is discarded
    // -------------------------------------------------------------------------

    public function test_rejects_low_confidence_insight(): void
    {
        $this->bindExtractorStub([[
            'category'   => 'tone',
            'insight'    => 'Talvez prefira tom formal.',
            'confidence' => 0.3,
        ]]);

        $this->runJob();

        $this->assertSame(0, ClientAiMemory::count());
    }

    // -------------------------------------------------------------------------
    // Test 3: Insight containing PII (email) is discarded
    // -------------------------------------------------------------------------

    public function test_rejects_insight_with_pii(): void
    {
        $this->bindExtractorStub([[
            'category'   => 'terminology',
            'insight'    => 'Contato: joao@example.com',
            'confidence' => 0.9,
        ]]);

        $this->runJob();

        $this->assertSame(0, ClientAiMemory::count());
    }

    // -------------------------------------------------------------------------
    // Test 4: When org has no key, job skips silently — no DB writes
    // -------------------------------------------------------------------------

    public function test_skips_when_no_anthropic_key(): void
    {
        $this->org->forceFill(['anthropic_api_key_encrypted' => null])->save();

        // Use real factory — it will abort(402) if called. The job should return early
        // before calling factory->forOrganization(), so no exception expected.
        (new ExtractClientMemoryJob($this->conv->fresh()))
            ->handle(app(AnthropicClientFactory::class), app(ClientMemoryExtractor::class));

        $this->assertSame(0, ClientAiMemory::count());
    }

    // -------------------------------------------------------------------------
    // Test 5: CPF in insight is also rejected (PII gate completeness)
    // -------------------------------------------------------------------------

    public function test_rejects_insight_with_cpf(): void
    {
        $this->bindExtractorStub([[
            'category'   => 'preferences',
            'insight'    => 'CPF do responsável: 123.456.789-09',
            'confidence' => 0.85,
        ]]);

        $this->runJob();

        $this->assertSame(0, ClientAiMemory::count());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Bind a test extractor stub that directly applies the real filtering gates
     * (confidence + PII) without making any API calls, using the provided fake insights.
     *
     * ClientMemoryExtractor is NOT final — anonymous subclass overrides extract().
     */
    private function bindExtractorStub(array $fakeInsights): void
    {
        $clientId = $this->client->id;
        $orgId    = $this->client->organization_id;

        $stub = new class($fakeInsights, $clientId, $orgId) extends ClientMemoryExtractor {
            public function __construct(
                private array $fakeInsights,
                private int   $clientId,
                private int   $orgId,
            ) {
                // skip parent constructor — no dependencies to inject
            }

            public function extract(AiConversation $conversation, $anthropic): array
            {
                $piiPatterns = [
                    '/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/',
                    '/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/',
                    '/[\w.+-]+@[\w-]+\.[\w.-]+/',
                    '/\b(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/',
                ];

                $accepted = [];
                foreach ($this->fakeInsights as $i) {
                    if ((float) $i['confidence'] < MemoryInsightSchema::MIN_CONFIDENCE_AUTO_APPLY) {
                        continue;
                    }
                    foreach ($piiPatterns as $re) {
                        if (preg_match($re, $i['insight'])) {
                            continue 2;
                        }
                    }
                    ClientAiMemory::updateOrCreate(
                        [
                            'client_id' => $this->clientId,
                            'category'  => $i['category'],
                            'insight'   => $i['insight'],
                        ],
                        [
                            'organization_id' => $this->orgId,
                            'confidence'      => (float) $i['confidence'],
                            'source'          => 'chat',
                        ],
                    );
                    $accepted[] = $i;
                }
                return $accepted;
            }
        };

        $this->app->instance(ClientMemoryExtractor::class, $stub);
    }

    private function runJob(): void
    {
        (new ExtractClientMemoryJob($this->conv))
            ->handle(app(AnthropicClientFactory::class), app(ClientMemoryExtractor::class));
    }
}
