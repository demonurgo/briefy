---
phase: 03-ai-integration
plan: 05
subsystem: ai
tags: [anthropic, sse, streaming, chat, byok, multi-turn, jobs, laravel, feature-test]

# Dependency graph
requires:
  - phase: 03-ai-integration
    plan: 01
    provides: "AnthropicClientFactory, AnthropicClientInterface, Organization.hasAnthropicKey(), config/services anthropic block"
  - phase: 03-ai-integration
    plan: 02
    provides: "ai_conversations + ai_conversation_messages tables, AiConversation model with compacted_at"
  - phase: 03-ai-integration
    plan: 04
    provides: "BriefStreamer SSE pattern, AnthropicClientInterface test double pattern, forceFill() for encrypted columns in tests"

provides:
  - "ChatPromptBuilder::chatSystem(Demand): two-block system array — stable cached prefix (ephemeral cache_control) + volatile last-20-comments tail"
  - "ChatStreamer::stream(AiConversation, string, AnthropicClientInterface): Generator — SSE delta/done/error, persists assistant turn on message_stop, dispatches ExtractClientMemoryJob + CompactConversationJob"
  - "AiChatController: startConversation() creates AiConversation scoped to org+user+demand; stream() persists user message BEFORE SSE opens, BYOK gate (D-33), triple-check org+context scoping (T-03-40)"
  - "ChatMessageRequest: required|string|min:1|max:4000 (T-03-41)"
  - "routes: demands.chat.start (POST) + demands.chat.stream (POST) inside auth+verified group"
  - "resources/prompts/chat_system.md: 31-line versioned system prompt with anti-hallucination rules"
  - "i18n: ai_chat_stream_failed in pt-BR/en/es"
  - "ExtractClientMemoryJob stub + CompactConversationJob stub — full impl deferred to Plan 07"
  - "AiChatControllerTest: 7 tests covering SSE contract, BYOK gate, persistence, validation, cross-org isolation, compaction dispatch"

affects: [03-07-PLAN, 03-09-PLAN, 03-12-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ChatStreamer uses AnthropicClientInterface (not \\Anthropic\\Client) — same BYOK pattern as BriefStreamer from Plan 04"
    - "ChatStreamer is NOT final — allows anonymous test double subclasses in PHPUnit"
    - "Two-block system prompt: stable block with cache_control ephemeral + volatile comments tail outside cache (80% cache hit on turns 2..N)"
    - "User message persisted BEFORE eventStream() callback opens — survives client disconnect (AI-SPEC pattern b)"
    - "Job stub pattern: dispatch() works with stub class, Queue::fake() + assertPushed() work in tests, full impl deferred to Plan 07"
    - "RefreshDatabase requires non-empty pgsql-schema.sql — regenerated via php artisan schema:dump when empty"

key-files:
  created:
    - resources/prompts/chat_system.md
    - app/Services/Ai/ChatPromptBuilder.php
    - app/Services/Ai/ChatStreamer.php
    - app/Http/Controllers/AiChatController.php
    - app/Http/Requests/ChatMessageRequest.php
    - app/Jobs/ExtractClientMemoryJob.php
    - app/Jobs/CompactConversationJob.php
    - tests/Feature/AiChatControllerTest.php
    - database/schema/pgsql-schema.sql
  modified:
    - routes/web.php
    - lang/pt-BR/app.php
    - lang/en/app.php
    - lang/es/app.php

key-decisions:
  - "ChatStreamer accepts AnthropicClientInterface (not \\Anthropic\\Client) — factory returns interface; plan code used wrong type"
  - "ChatStreamer is NOT final — anonymous subclass test doubles work without interface overhead"
  - "Job stubs (ExtractClientMemoryJob, CompactConversationJob) created in Plan 05 — dispatch() needs the class to exist; full impl in Plan 07"
  - "pgsql-schema.sql was empty — regenerated via schema:dump so RefreshDatabase could load test DB"

patterns-established:
  - "SSE streaming test: headers-only assert (no sendContent) + persistence via direct generator exhaustion in separate test"
  - "forceFill() to bypass $fillable when setting encrypted column in tests"

requirements-completed: [AI-04, AI-05, AI-07]

# Metrics
duration: ~8min
completed: 2026-04-23
---

# Phase 03 Plan 05: Chat Streaming Summary

**Multi-turn chat SSE endpoint via Claude Sonnet 4.6 with dual-block cached system prompt, pre-stream user message persistence, and post-turn job dispatch for memory extraction and compaction**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-23T01:57:39Z
- **Completed:** 2026-04-23T02:05:51Z
- **Tasks:** 3
- **Files modified:** 13 (9 created, 4 modified)

## Accomplishments

- `resources/prompts/chat_system.md` — 31-line versioned system prompt with anti-hallucination constraints (D-12): "Do NOT invent past interactions, past campaigns, or client preferences that are not explicitly recorded"
- `ChatPromptBuilder::chatSystem()` — builds two system blocks: first block cached with `cache_control: ephemeral` (stable per demand/client), second block holds last-20 comments tail outside cache (volatile); covers all D-12 items: client name, aiMemory insights, demand metadata, files, last 20 comments
- `ChatStreamer` — streams via `anthropic->messages()->createStream(...)`, yields SSE delta/done/error events, persists assistant message on `message_stop`, dispatches `ExtractClientMemoryJob` every turn and `CompactConversationJob` when message count exceeds 30 (`COMPACTION_THRESHOLD`)
- `AiChatController` — `startConversation()` creates `AiConversation` scoped to org+user+demand; `stream()` persists user turn BEFORE opening event stream (AI-SPEC pattern b), triple-checks org+context+demand scoping (T-03-40), BYOK gate (D-33)
- `ChatMessageRequest` — `required|string|min:1|max:4000` (T-03-41)
- Routes registered: `demands.chat.start` (POST) + `demands.chat.stream` (POST) inside `auth+verified` group
- i18n key `ai_chat_stream_failed` added to pt-BR/en/es
- Job stubs `ExtractClientMemoryJob` + `CompactConversationJob` created — dispatch() calls work, tests use `Queue::fake()` + `Queue::assertPushed()`; full implementation deferred to Plan 07
- `AiChatControllerTest` — 7 tests all passing: conversation scoping, BYOK gate, SSE response + user persistence, assistant persistence, validation 422, cross-org 403, compaction threshold dispatch

## Task Commits

1. **Task 1: ChatPromptBuilder + versioned prompt** — `1fecbbd` (feat)
2. **Task 2: ChatStreamer + AiChatController + ChatMessageRequest + routes + i18n** — `80a4e44` (feat)
3. **Task 3: AiChatControllerTest (TDD)** — `d1bff33` (test)

## Files Created/Modified

- `resources/prompts/chat_system.md` — 31-line versioned chat system prompt with anti-hallucination rules
- `app/Services/Ai/ChatPromptBuilder.php` — builds dual-block system prompt array with cache_control ephemeral
- `app/Services/Ai/ChatStreamer.php` — SSE generator streaming multi-turn chat, persisting messages, dispatching jobs
- `app/Http/Controllers/AiChatController.php` — startConversation() + stream() with BYOK gate and org-scoped auth
- `app/Http/Requests/ChatMessageRequest.php` — validation: required|string|min:1|max:4000
- `app/Jobs/ExtractClientMemoryJob.php` — stub for Plan 07 (dispatch enabled)
- `app/Jobs/CompactConversationJob.php` — stub for Plan 07 (dispatch enabled)
- `tests/Feature/AiChatControllerTest.php` — 7 feature tests, all passing
- `database/schema/pgsql-schema.sql` — regenerated (was empty, required for RefreshDatabase)
- `routes/web.php` — added demands.chat.start + demands.chat.stream routes
- `lang/pt-BR/app.php` — added ai_chat_stream_failed
- `lang/en/app.php` — added ai_chat_stream_failed
- `lang/es/app.php` — added ai_chat_stream_failed

## Decisions Made

- Used `AnthropicClientInterface` in `ChatStreamer::stream()` instead of `\Anthropic\Client` — matches BYOK factory pattern from Plan 04; the plan's code sample used the wrong type
- Made `ChatStreamer` NOT final — same as `BriefStreamer`, allows anonymous test double subclasses
- Created job stubs for `ExtractClientMemoryJob` + `CompactConversationJob` in Plan 05 — the dispatch() references require the class to exist for PHP to compile; Queue::assertPushed() works in tests; full impl in Plan 07
- Regenerated `pgsql-schema.sql` — was empty (0 bytes), causing RefreshDatabase to fail loading the test DB

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ChatStreamer typed \Anthropic\Client but factory returns AnthropicClientInterface**
- **Found during:** Task 2 analysis (pre-implementation) — same bug as in Plan 04 (documented in 03-04-SUMMARY)
- **Issue:** Plan's code sample used `\Anthropic\Client $anthropic` but `AnthropicClientFactory::forOrganization()` returns `AnthropicClientInterface`
- **Fix:** Changed ChatStreamer::stream() to accept `AnthropicClientInterface` and used `$anthropic->messages()->createStream(...)` (method call, not property access)
- **Files modified:** `app/Services/Ai/ChatStreamer.php`
- **Committed in:** `80a4e44` (Task 2 commit)

**2. [Rule 3 - Blocking] Job stubs needed to unblock ChatStreamer compilation and tests**
- **Found during:** Task 3 — `app/Jobs/` directory did not exist; `ChatStreamer.php` references `ExtractClientMemoryJob` and `CompactConversationJob` at class level (use statements + dispatch() calls); PHP can't load the class without the referenced classes
- **Fix:** Created `ExtractClientMemoryJob` and `CompactConversationJob` as minimal ShouldQueue stubs with comment "Implemented in Plan 07"
- **Files modified:** `app/Jobs/ExtractClientMemoryJob.php`, `app/Jobs/CompactConversationJob.php`
- **Committed in:** `d1bff33` (Task 3 commit)

**3. [Rule 3 - Blocking] pgsql-schema.sql was empty (0 bytes) — RefreshDatabase load failed**
- **Found during:** Task 3 test run — `psql` error "relação migrations não existe" in briefy_test DB
- **Issue:** `database/schema/pgsql-schema.sql` was a 0-byte file; `RefreshDatabase` tries to load this dump into the test DB
- **Fix:** Ran `php artisan schema:dump` to regenerate the dump from the main `briefy` database (36840 bytes)
- **Files modified:** `database/schema/pgsql-schema.sql`
- **Committed in:** `d1bff33` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 Rule 1 bug, 2 Rule 3 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and test execution. No scope creep.

## Issues Encountered

- `psql` not in PATH on Windows dev machine — resolved by adding `C:\Program Files\PostgreSQL\17\bin` to PATH before running tests

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `ExtractClientMemoryJob::handle()` | `app/Jobs/ExtractClientMemoryJob.php` | Stub; full implementation in Plan 07 |
| `CompactConversationJob::handle()` | `app/Jobs/CompactConversationJob.php` | Stub; full implementation in Plan 07 |

These stubs do not prevent this plan's goal (chat SSE endpoint) from being achieved — dispatch() works, jobs are queued, they just don't execute meaningful logic yet.

## Threat Flags

No new security surface beyond the plan's threat model. All mitigations applied:
- T-03-40: Triple-check in `stream()` — `demand.org + conversation.org + conversation.context_id == demand.id`
- T-03-41: `ChatMessageRequest` max:4000
- T-03-44: `conversation.organization_id` checked before any write

## Next Phase Readiness

- Chat SSE endpoint functional end-to-end: `POST /demands/{demand}/chat/conversations` + `POST /demands/{demand}/chat/{conversation}/stream`
- `ai_conversation_messages` grows 2 rows per turn (user + assistant)
- `ExtractClientMemoryJob` dispatched on every completed turn (Plan 07 implements the extraction logic)
- `CompactConversationJob` dispatched when message count > 30 (Plan 07 implements compaction)
- Plan 09 (UI: Chat tab in DemandDetailModal) can wire to these endpoints

## Self-Check: PASSED

All 9 created files confirmed present on disk. All 3 task commits (1fecbbd, 80a4e44, d1bff33) confirmed in git log. All 7 tests pass.

---
*Phase: 03-ai-integration*
*Completed: 2026-04-23*
