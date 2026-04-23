---
phase: 3
created_at: 2026-04-23
purpose: |
  Cross-plan overrides from the Codex review (03-REVIEWS.md) that were NOT applied
  as per-plan Edit passes. During execution of each affected plan, the executor MUST
  read THIS file first and apply the overrides below in addition to the plan body.
applies_to_plans:
  - 03-04-PLAN.md (H4 — SSE error responses)
  - 03-05-PLAN.md (H4 — SSE error responses)
  - 03-07-PLAN.md (H5 — test mock pattern; H1 — ClientAiMemory schema)
  - 03-10-PLAN.md (M7 — owns "Conhecer este cliente com IA" button)
  - 03-11-PLAN.md (already patched: H3 single-line fix)
  - 03-12-PLAN.md (H6 — split into core + 12b deferred; M5 — key rotation; H1 — schema)
already_fixed_in_plans:
  - 03-01-PLAN.md (H2 role + H3 auth share + M1 package name + M3 key health + M4 dontFlash/throttle + L1 mask accessor)
  - 03-02-PLAN.md (H1 client_ai_memory additive migration + M2 SQLite checkpoint + M3 key health columns + L1 drop mask column)
  - 03-11-PLAN.md (H3 — single-line patch for `auth.user.organization` prop)
---

# Phase 3 — Codex Review Fixes (override file)

> This file captures review fixes that span multiple plans or require surgical
> patches too small to justify a full plan revision. **Read this file before
> executing any plan in the `applies_to_plans` list above.** The overrides below
> take precedence over the original plan text.

Source: `.planning/phases/03-ai-integration/03-REVIEWS.md` (Codex gpt-5.4, risk HIGH).

---

## Tier 1 overrides (MUST apply during execution)

### H4 — SSE endpoints must return JSON/SSE errors, NOT `back()->with(...)`

**Applies to:** Plan 04 (BriefStreamer) and Plan 05 (ChatStreamer).

**Rule:** The existing plan text uses `back()->with('error', __('app.ai_key_missing'))` on the streaming controllers. `fetch` + `ReadableStream` consumers do not handle HTML redirects and will render the redirect body into the typewriter. Replace this pattern as follows:

**In `AiBriefController@generate` (Plan 04 Task — around line 431):**

Replace:
```php
if (! $org->hasAnthropicKey()) {
    return back()->with('error', __('app.ai_key_missing'));
}
```

With:
```php
if (! $org->hasAnthropicKey() || ! $org->anthropic_key_valid) {
    return response()->json([
        'error' => 'no_anthropic_key',
        'message' => __('app.ai_key_missing'),
    ], 402);  // 402 Payment Required — semantic for "needs credential"
}
```

**In `AiChatController@stream` (Plan 05 Task — around line 465):** Apply the same replacement verbatim.

**In the feature test (Plan 04 line 575-ish):**

Replace `test_generate_without_anthropic_key_returns_back_with_error` with:
```php
public function test_generate_without_anthropic_key_returns_402_json(): void
{
    // Org has no key — expect JSON 402 (H4 — SSE-native error; NOT back()->with).
    $response = $this->actingAs($this->user)
        ->postJson("/demands/{$this->demand->id}/brief/generate");

    $response->assertStatus(402)
        ->assertJson(['error' => 'no_anthropic_key']);
}
```

**In the SSE happy-path handler — mid-stream failures:**

When the SDK raises during streaming (APIStatusException, RateLimitException, timeout), do NOT let the exception bubble and close the stream ungracefully. Instead, emit a final SSE frame then close cleanly:

```php
// Inside the generator, in the catch block:
echo "event: error\n";
echo "data: " . json_encode([
    'error' => match (true) {
        $e instanceof \Anthropic\Core\Exceptions\RateLimitException => 'rate_limit',
        $e instanceof \Anthropic\Core\Exceptions\APIStatusException && $e->getStatusCode() === 401 => 'invalid_key',
        default => 'stream_failed',
    },
    'message' => $e->getMessage(),
]) . "\n\n";
// On invalid_key (401), also mark the org key as invalid before returning:
if (isset($error) && $error === 'invalid_key') {
    $org->forceFill(['anthropic_key_valid' => false])->save();
}
ob_flush();
flush();
return;
```

**In `resources/js/Hooks/useAiStream.ts` (Plan 08):**

Extend the hook so it handles BOTH pre-stream 402 responses AND mid-stream `event: error` frames. Expose `onError(errorCode, message)` callback. When `errorCode === 'no_anthropic_key'`, the UI should redirect to `/settings/ai` with a flash message. When `errorCode === 'invalid_key'`, show a modal "Sua chave Anthropic foi rejeitada. Verifique em Configurações → IA".

---

### H5 — Tests must use Mockery, not anonymous subclass of `final` classes

**Applies to:** Plans 01, 04, 05, 06, 07, 12 test tasks.

**Rule:** PHP rejects `new class extends SomeFinalClass {}` at compile time. All mocks in test tasks must use one of:

1. **Mockery** (preferred for services):
   ```php
   $mock = \Mockery::mock(\App\Services\Ai\AnthropicClientFactory::class);
   $mock->shouldReceive('forOrganization')->andReturn($fakeClient);
   $this->app->instance(\App\Services\Ai\AnthropicClientFactory::class, $mock);
   ```

2. **Interface-based fake** (preferred for `AnthropicClient` itself):
   Introduce `App\Contracts\Ai\AnthropicClientContract` (empty or with the methods we use: `messages->create()`, `messages->createStream()`). `AnthropicClientFactory::forOrganization()` returns the contract, not the concrete SDK `Client`. Tests bind a fake contract implementation.

3. **Remove `final` keyword** on service classes that are mock targets if option 1/2 is impractical. Do NOT keep `final` on `AnthropicClientFactory`, `BriefStreamer`, `ChatStreamer`, `MonthlyPlanGenerator`, `ClientResearchAgent`, `ClientMemoryExtractor`, `ConversationCompactor`, `ItemRedesigner` — these are designed to be mocked.

**Audit script (add to Plan 03 Task 2 CI check):**
```bash
# No anonymous subclass of final classes in tests
grep -rn "new class extends" tests/ | while read line; do
  class=$(echo "$line" | sed 's/.*extends \([A-Za-z\\]*\).*/\1/')
  file="app/$(echo $class | tr '\\\\' '/' | sed 's/App\///').php"
  if [ -f "$file" ] && grep -q "^final class" "$file"; then
    echo "ERROR: test subclasses final class $class — $line"
    exit 1
  fi
done
```

---

### H6 — Plan 12 split into core + 12b deferred

**Applies to:** Plan 12 execution.

**Rule:** The original Plan 12 (7 tasks: MA wrapper + polling + SSE proxy + timeline modal + suggestion review UI + cost confirm) is scope-inflated for a 4-day hackathon. Split:

**Plan 12 (HACKATHON CORE — DO EXECUTE):**
- Task 1: `ClientResearchAgent` raw HTTP wrapper (create Agent + Environment once per org, cache IDs on `organizations` table — needs a Plan 02 migration column `client_research_agent_id` and `client_research_environment_id` — verify they're in Plan 02's migration, add if missing).
- Task 2: `ClientResearchController@launch` (POST `/clients/{client}/research`) + `PollClientResearchSessionJob` (polling MA API every 30s until `completed` or `failed`, max 45 min). NO SSE proxy.
- Task 3: `processEvent` writes final insights to `client_ai_memory` with `status='active'` for confidence ≥0.6 and `status='suggested'` for <0.6 (H1 already added the `status` column in Plan 02).
- Task 4: Launch button UX — **lives in ClientForm edit view (Plan 10 owns the UI component; Plan 12 only owns the backend endpoint + route)**. See M7 below.
- Task 5: Badge "🔍 Pesquisando — ~XX min restantes" on Clients/Index — reads `client_research_sessions.status` via Inertia prop, no live SSE. Polling via `router.reload({interval: 30000})` or manual refresh; acceptable UX for v1.1.
- Task 6 (human-verify): run one real MA session end-to-end in dev with a real Anthropic API key that has MA beta access.

**Plan 12b (DEFERRED v1.2 — DO NOT EXECUTE):**
Create stub file `03-12b-PLAN.md` with `status: deferred` frontmatter and contents describing:
- SSE proxy for live timeline events (`GET /clients/{client}/research/{session}/events`)
- `ClientResearchTimelineModal.tsx` component
- `ClientAiMemoryController@approve` / `@dismiss` + Sugestões tab in `ClientAiMemoryPanel`

The 12b stub is documentation only — reference it in CONTEXT.md "Deferred Ideas" under a new "v1.2" block.

**CONTEXT.md update needed:** add to the `<deferred>` section in `03-CONTEXT.md`:
```
### Deferred to v1.2 (from Codex review H6)

- Live SSE timeline of Managed Agent events (replaced by 30s DB polling in v1.1)
- Clickable Managed Agent session timeline modal
- `ClientAiMemoryPanel` Sugestões tab with Aprovar/Descartar actions for confidence<0.6 insights (v1.1 persists them with `status='suggested'` but no review UI yet)
```

---

### M5 — Key rotation / mid-stream invalidation

**Applies to:** Plans 04, 05, 07, 12 (all jobs and streaming controllers).

**Rule:** When the org's Anthropic key changes during an in-flight operation (mid-stream, queued job), the operation must abort gracefully — NOT silently retry with the new key, NOT crash.

Add to each streaming controller and queued job:

```php
// At the top of the handler:
$keyCheckedAt = $this->org->anthropic_key_checked_at?->copy();

// Before every Anthropic call (in long-running loops):
$this->org->refresh();
if ($this->org->anthropic_key_checked_at?->ne($keyCheckedAt)) {
    // Key changed since we started. Abort.
    if ($this->isStreaming()) {
        echo "event: error\n";
        echo "data: " . json_encode(['error' => 'key_rotated', 'message' => __('app.ai_key_rotated')]) . "\n\n";
        flush();
        return;
    }
    Log::warning('ai.operation.aborted_key_rotated', ['org_id' => $this->org->id, 'operation' => static::class]);
    return;  // For queued jobs: exit without retry
}
```

Frontend handles `error: key_rotated` by showing "Sua chave Anthropic foi alterada. Tente novamente." modal.

---

### M7 — "Conhecer este cliente com IA" button ownership

**Rule:** The launch UX lives in **ClientForm (edit view only)** — Plan 10 owns the button component, cost-confirm integration, and `router.post()` call. Plan 12 owns only the backend route `/clients/{client}/research` and the `ClientResearchAgent` + polling job.

- Plan 10 imports `CostConfirmModal` from Plan 06.
- Plan 12 does NOT add any UI to `ClientForm` or `Clients/Index.tsx`.
- `Clients/Index.tsx` shows the "🔍 Pesquisando" badge — this badge update is shared: Plan 10 adds the badge component, Plan 12 feeds the data via Inertia prop (`client.research_session`).

---

## Tier 2 overrides (SHOULD apply)

### M1 — Package name `anthropic-ai/sdk`

Plan 01 line 399 already notes: "This installs the Packagist package `anthropic-ai/sdk` (GitHub repo slug is `anthropics/anthropic-sdk-php` — confusing but documented)". When grepping the codebase during execution, the Composer package name is `anthropic-ai/sdk` — this is the only name that should appear in `composer.json` or `composer require` commands. The GitHub slug may appear in reference URLs but never in package-manager commands.

### M6 — Do not gate tests on cache hit rate

Plans 04/05 may include `cache_control` directives in their Anthropic calls, but test assertions must NOT check `cache_read_input_tokens > 0`. Cache hit rate is a Phoenix/eval concern (Section 7 of AI-SPEC), not an execution gate. Keep caching as a performance directive, not a test assertion.

---

## Verification After Execution

After all affected plans are executed, run these checks to confirm the review fixes are in the codebase:

```bash
# H3: no auth.organization (sibling) references in frontend code — only auth.user.organization
! grep -rn "auth\.organization\." resources/js/ || { echo "H3 BROKEN"; exit 1; }

# H4: no back()->with on streaming endpoints
! grep -n "back()->with" app/Http/Controllers/AiBriefController.php || { echo "H4 BROKEN"; exit 1; }
! grep -n "back()->with" app/Http/Controllers/AiChatController.php || { echo "H4 BROKEN"; exit 1; }

# H5: no final classes subclassed in tests
# (covered by the Plan 03 CI check above)

# M1: only anthropic-ai/sdk in composer.json
grep -q '"anthropic-ai/sdk"' composer.json || { echo "M1 BROKEN"; exit 1; }
! grep -q "anthropics/anthropic-sdk-php" composer.json || { echo "M1 BROKEN"; exit 1; }

# H2: no 'owner' role references in new PHP files
! grep -rn "'owner'" app/Http/Controllers/Settings/ app/Services/Ai/ app/Models/ 2>/dev/null || { echo "H2 BROKEN"; exit 1; }

# H6: Plan 12b stub exists as deferred reference
test -f .planning/phases/03-ai-integration/03-12b-PLAN.md || { echo "H6 BROKEN"; exit 1; }
```

These checks are suitable for inclusion in a post-execution verification pass or in `/gsd-verify-work`.
