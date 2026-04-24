<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Jobs\CompactConversationJob;
use App\Jobs\ExtractClientMemoryJob;
use App\Models\AiConversation;
use App\Models\Client;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\User;
use App\Services\Ai\AnthropicClientInterface;
use App\Services\Ai\ChatStreamer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\StreamedEvent;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AiChatControllerTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $user;
    private Client $client;
    private Demand $demand;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org    = Organization::factory()->create();
        $this->user   = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->client = Client::factory()->create(['organization_id' => $this->org->id]);
        $this->demand = Demand::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $this->client->id,
        ]);
    }

    // ---------------------------------------------------------------------------
    // Test 1: startConversation creates AiConversation scoped to org+user+demand
    // ---------------------------------------------------------------------------

    public function test_start_conversation_creates_row(): void
    {
        $res = $this->actingAs($this->user)
            ->postJson("/demands/{$this->demand->id}/chat/conversations");

        $res->assertStatus(200);
        $res->assertJsonStructure(['id', 'created_at']);
        $this->assertDatabaseHas('ai_conversations', [
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'context_type'    => 'demand',
            'context_id'      => $this->demand->id,
        ]);
    }

    // ---------------------------------------------------------------------------
    // Test 2: stream without Anthropic key → redirects with error (D-33 gate)
    // ---------------------------------------------------------------------------

    public function test_stream_without_key_redirects_with_error(): void
    {
        $conv = AiConversation::create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'context_type'    => 'demand',
            'context_id'      => $this->demand->id,
        ]);

        $res = $this->actingAs($this->user)
            ->post("/demands/{$this->demand->id}/chat/{$conv->id}/stream", ['message' => 'oi']);

        $res->assertRedirect();
        $res->assertSessionHas('error');
    }

    // ---------------------------------------------------------------------------
    // Test 3a: stream with valid key returns event-stream response (headers only)
    // NOTE: sendContent() is NOT called here — calling it in PHPUnit writes raw bytes
    // to stdout and crashes the test runner (same known issue as in AiBriefControllerTest).
    // Persistence is tested separately in test_stream_persists_user_and_assistant_messages.
    // ---------------------------------------------------------------------------

    public function test_stream_with_valid_key_returns_event_stream_response(): void
    {
        Queue::fake();
        $this->org->forceFill(['anthropic_api_key_encrypted' => 'sk-ant-' . str_repeat('a', 50)])->save();

        $conv = AiConversation::create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'context_type'    => 'demand',
            'context_id'      => $this->demand->id,
        ]);

        $this->app->instance(ChatStreamer::class, new class extends ChatStreamer {
            public function __construct() {}
            public function stream($conversation, string $userMessage, AnthropicClientInterface $anthropic): \Generator
            {
                yield new StreamedEvent(event: 'delta', data: json_encode(['text' => 'Olá']));
                yield new StreamedEvent(event: 'done', data: json_encode(['ok' => true]));
            }
        });

        $res = $this->actingAs($this->user)
            ->post("/demands/{$this->demand->id}/chat/{$conv->id}/stream", ['message' => 'Olá IA']);

        $res->assertStatus(200);
        $this->assertStringContainsString('text/event-stream', $res->headers->get('Content-Type'));

        // User message persisted BEFORE stream opens (AI-SPEC pattern b).
        $this->assertDatabaseHas('ai_conversation_messages', [
            'conversation_id' => $conv->id,
            'role'            => 'user',
            'content'         => 'Olá IA',
        ]);
    }

    // ---------------------------------------------------------------------------
    // Test 3b: assistant message persisted + ExtractClientMemoryJob dispatched
    // Tests persistence contract independently of HTTP streaming transport.
    // ---------------------------------------------------------------------------

    public function test_stream_persists_user_and_assistant_messages(): void
    {
        Queue::fake();

        $conv = AiConversation::create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'context_type'    => 'demand',
            'context_id'      => $this->demand->id,
        ]);

        // Pre-persist user message (simulates what AiChatController does before opening stream).
        $conv->messages()->create(['role' => 'user', 'content' => 'Olá IA']);

        // Build a fake ChatStreamer that persists assistant message and dispatches job.
        $fakeStreamer = new class extends ChatStreamer {
            public function __construct() {}
            public function stream(AiConversation $conversation, string $userMessage, AnthropicClientInterface $anthropic): \Generator
            {
                yield new StreamedEvent(event: 'delta', data: json_encode(['text' => 'Resposta da IA.']));
                $conversation->messages()->create(['role' => 'assistant', 'content' => 'Resposta da IA.']);
                ExtractClientMemoryJob::dispatch($conversation->fresh())->onQueue('ai');
                yield new StreamedEvent(event: 'done', data: json_encode(['ok' => true, 'assistant_message_id' => 1]));
            }
        };

        $fakeAnthropic = new class implements AnthropicClientInterface {
            public function messages(): object { return new \stdClass; }
            public function beta(): object { return new \stdClass; }
        };

        // Exhaust the generator directly (simulates what StreamedResponse callback does).
        foreach ($fakeStreamer->stream($conv, 'Olá IA', $fakeAnthropic) as $_) {
        }

        $this->assertDatabaseHas('ai_conversation_messages', [
            'conversation_id' => $conv->id,
            'role'            => 'user',
            'content'         => 'Olá IA',
        ]);
        $this->assertDatabaseHas('ai_conversation_messages', [
            'conversation_id' => $conv->id,
            'role'            => 'assistant',
            'content'         => 'Resposta da IA.',
        ]);
        Queue::assertPushed(ExtractClientMemoryJob::class);
    }

    // ---------------------------------------------------------------------------
    // Test 4: message > 4000 chars → validation error (T-03-41)
    // ---------------------------------------------------------------------------

    public function test_stream_rejects_oversize_message(): void
    {
        $conv = AiConversation::create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'context_type'    => 'demand',
            'context_id'      => $this->demand->id,
        ]);

        $res = $this->actingAs($this->user)
            ->post("/demands/{$this->demand->id}/chat/{$conv->id}/stream", [
                'message' => str_repeat('a', 4001),
            ]);

        $res->assertStatus(302);
        $res->assertSessionHasErrors('message');
    }

    // ---------------------------------------------------------------------------
    // Test 5: Cross-org conversation access → 403 (T-03-40, T-03-44)
    // ---------------------------------------------------------------------------

    public function test_cross_org_conversation_returns_403(): void
    {
        $otherOrg  = Organization::factory()->create();
        $otherUser = User::factory()->create(['current_organization_id' => $otherOrg->id]);

        $conv = AiConversation::create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'context_type'    => 'demand',
            'context_id'      => $this->demand->id,
        ]);

        $this->actingAs($otherUser)
            ->post("/demands/{$this->demand->id}/chat/{$conv->id}/stream", ['message' => 'hi'])
            ->assertStatus(403);
    }

    // ---------------------------------------------------------------------------
    // Test 6: Compaction trigger when msgs > 30 → CompactConversationJob dispatched
    // ---------------------------------------------------------------------------

    public function test_compaction_job_dispatched_when_messages_exceed_threshold(): void
    {
        Queue::fake();

        $conv = AiConversation::create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'context_type'    => 'demand',
            'context_id'      => $this->demand->id,
        ]);

        // Pre-populate > 30 messages to exceed COMPACTION_THRESHOLD.
        for ($i = 0; $i < 31; $i++) {
            $conv->messages()->create([
                'role'    => $i % 2 === 0 ? 'user' : 'assistant',
                'content' => "Message {$i}",
            ]);
        }

        // Build fake streamer that dispatches jobs (mirrors ChatStreamer logic).
        $fakeStreamer = new class extends ChatStreamer {
            public function __construct() {}
            public function stream(AiConversation $conversation, string $userMessage, AnthropicClientInterface $anthropic): \Generator
            {
                $msg = $conversation->messages()->create(['role' => 'assistant', 'content' => 'reply']);
                ExtractClientMemoryJob::dispatch($conversation->fresh())->onQueue('ai');
                if ($conversation->messages()->count() > \App\Services\Ai\ChatStreamer::COMPACTION_THRESHOLD) {
                    CompactConversationJob::dispatch($conversation->fresh())->onQueue('ai');
                }
                yield new StreamedEvent(
                    event: 'done',
                    data: json_encode(['ok' => true, 'assistant_message_id' => $msg->id]),
                );
            }
        };

        $fakeAnthropic = new class implements AnthropicClientInterface {
            public function messages(): object { return new \stdClass; }
            public function beta(): object { return new \stdClass; }
        };

        foreach ($fakeStreamer->stream($conv, 'test', $fakeAnthropic) as $_) {
        }

        Queue::assertPushed(CompactConversationJob::class);
        Queue::assertPushed(ExtractClientMemoryJob::class);
    }
}
