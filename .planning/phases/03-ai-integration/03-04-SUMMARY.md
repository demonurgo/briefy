---
phase: 03-ai-integration
plan: 04
subsystem: ai
tags: [anthropic, sse, streaming, brief, byok, laravel, feature-test]

# Dependency graph
requires:
  - phase: 03-ai-integration
    plan: 01
    provides: "AnthropicClientFactory, AnthropicClientInterface, Organization.hasAnthropicKey(), config/services anthropic block"

provides:
  - "BriefPromptBuilder: build(Demand) returns [system_blocks, user_message] with cache_control ephemeral"
  - "BriefStreamer: stream(Demand, AnthropicClientInterface) yields SSE delta/done/error events, persists ai_analysis.brief on message_stop"
  - "AiBriefController: generate() SSE + saveEdit() PATCH with BYOK gate (D-33) and org-scoped authorizeDemand (T-03-30)"
  - "UpdateBriefRequest: required|string|min:1|max:20000 (T-03-31)"
  - "routes: demands.brief.generate (POST SSE) + demands.brief.edit (PATCH)"
  - "resources/prompts/brief_system.md: versioned 32-line system prompt with 9 mandatory sections"
  - "i18n: brief_updated, ai_stream_failed, ai_key_missing in pt-BR/en/es"
  - "AiBriefControllerTest: 6 tests — SSE contract, BYOK gate, persistence, PATCH, validation, cross-org 403"

affects: [03-08-PLAN, 03-09-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SSE via response()->eventStream(fn () => yield from $streamer->stream(...)) — first streaming endpoint in codebase"
    - "BriefStreamer accepts AnthropicClientInterface (not Anthropic\\Client) — preserves BYOK testability"
    - "BriefPromptBuilder: strtr() template substitution for client memory injection"
    - "cache_control ephemeral on system block — stable prefix caching for Sonnet 4.6"
    - "forceFill() to bypass $fillable mass-assignment guard when setting encrypted column in tests"
    - "Test double: anonymous class extends BriefStreamer (non-final) bound via $app->instance()"
    - "Streaming test split: headers-only assert (no sendContent) + persistence via direct generator exhaustion"
    - "set_time_limit(0) inside stream() — prevents PHP execution timeout on long Anthropic streams"

key-files:
  created:
    - resources/prompts/brief_system.md
    - app/Services/Ai/BriefPromptBuilder.php
    - app/Services/Ai/BriefStreamer.php
    - app/Http/Controllers/AiBriefController.php
    - app/Http/Requests/UpdateBriefRequest.php
    - tests/Feature/AiBriefControllerTest.php
  modified:
    - routes/web.php
    - lang/pt-BR/app.php
    - lang/en/app.php
    - lang/es/app.php

key-decisions:
  - "BriefStreamer accepts AnthropicClientInterface (not \\Anthropic\\Client) — AnthropicClientFactory returns the interface, not the raw SDK class"
  - "BriefStreamer is NOT final — allows anonymous test double subclasses without introducing an interface"
  - "Test for streaming response splits into two: assertStatus+content-type (no sendContent) + separate persistence test exhausting generator directly"
  - "forceFill() required in tests to write anthropic_api_key_encrypted past mass-assignment protection"

# Metrics
duration: ~10min
completed: 2026-04-23
---

# Phase 03 Plan 04: Brief Streaming Summary

**BriefPromptBuilder + BriefStreamer + AiBriefController implementing SSE brief generation via Claude Sonnet 4.6 createStream, with BYOK gate, org-scoped authorization, PATCH edit endpoint, and 6-test feature suite covering all must_haves**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-23T01:44:13Z
- **Completed:** 2026-04-23T01:54:01Z
- **Tasks:** 3
- **Files modified:** 10 (6 created, 4 modified)

## Accomplishments

- `resources/prompts/brief_system.md` — 32-line versioned system prompt with 9 mandatory sections (Objetivo, Público-alvo, Canal e formato, Extensão aproximada, Tom, Pontos obrigatórios, Pontos a evitar, CTA, Prazo)
- `BriefPromptBuilder` — reads prompt template, substitutes `{{client_name}}` and `{{client_memory}}` from client.aiMemory(), returns `[system_blocks, user_message]` with `cache_control: ephemeral` on the first block
- `BriefStreamer` — streams via `anthropic->messages()->createStream(...)`, yields `StreamedEvent` delta/done/error, persists `ai_analysis.brief + brief_generated_at + brief_model` on `message_stop`
- `AiBriefController` — `generate()` checks `hasAnthropicKey()` gate (D-33), calls `forOrganization()`, wraps streamer in `response()->eventStream()`; `saveEdit()` PATCH merges `brief_edited_at` + `brief_edited_by_user_id` into `ai_analysis` (T-03-32)
- `UpdateBriefRequest` — `required|string|min:1|max:20000` (T-03-31)
- Routes registered: `demands.brief.generate` (POST) and `demands.brief.edit` (PATCH) inside `auth+verified` middleware group
- i18n keys added to pt-BR/en/es: `brief_updated`, `ai_stream_failed`, `ai_key_missing`
- `AiBriefControllerTest` — 6 tests all passing: no-key degradation, SSE response, persistence, PATCH update, PATCH validation, cross-org 403

## Task Commits

1. **Task 1: BriefPromptBuilder + brief_system.md** — `9305300` (feat)
2. **Task 2: BriefStreamer + AiBriefController + UpdateBriefRequest + routes + i18n** — `720451a` (feat)
3. **Task 3: AiBriefControllerTest (TDD)** — `c65393c` (test)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `final` class prevented anonymous test double extension**
- **Found during:** Task 3 — PHPUnit fatal "Premature end of PHP process" (exit caused by fatal error in worker)
- **Issue:** `BriefStreamer` was declared `final`, but the test uses `new class extends BriefStreamer {}` to create a streaming fake
- **Fix:** Removed `final` from `BriefStreamer` (matching `AnthropicClientFactory` which is also not final)
- **Files modified:** `app/Services/Ai/BriefStreamer.php`
- **Commit:** `c65393c`

**2. [Rule 1 - Bug] `$fillable` mass-assignment guard silently blocked `anthropic_api_key_encrypted` update in test setup**
- **Found during:** Task 3 — streaming test returned 302 (key missing) after `$org->update([...])`
- **Issue:** `anthropic_api_key_encrypted` is not in `Organization::$fillable`; `update()` silently ignored it
- **Fix:** Changed test to `$this->org->forceFill([...])->save()` to bypass mass-assignment protection
- **Files modified:** `tests/Feature/AiBriefControllerTest.php`
- **Commit:** `c65393c`

**3. [Rule 1 - Bug] `sendContent()` on StreamedResponse crashes PHPUnit test runner via `flush()`**
- **Found during:** Task 3 — original test called `ob_start()` + `response->sendContent()` which caused fatal in PHPUnit process
- **Issue:** `flush()` inside `eventStream` callback writes bytes to stdout during test execution, terminating the process
- **Fix:** Split test into two: (a) assertStatus(200) + content-type without sendContent, (b) separate test exhausts generator directly to verify persistence
- **Files modified:** `tests/Feature/AiBriefControllerTest.php`
- **Commit:** `c65393c`

**4. [Rule 1 - Bug] `BriefStreamer` was typed `\Anthropic\Client` but factory returns `AnthropicClientInterface`**
- **Found during:** Task 2 analysis (pre-implementation) — `AnthropicClientFactory::forOrganization()` returns `AnthropicClientInterface`, not `\Anthropic\Client`; the plan's code sample used `\Anthropic\Client`
- **Fix:** Changed `BriefStreamer::stream()` signature to accept `AnthropicClientInterface` and changed `$anthropic->messages->createStream(...)` (property access) to `$anthropic->messages()->createStream(...)` (method call)
- **Files modified:** `app/Services/Ai/BriefStreamer.php`, `app/Http/Controllers/AiBriefController.php`
- **Commit:** `720451a`

## Routes Registered

```
POST  demands/{demand}/brief/generate  demands.brief.generate  AiBriefController@generate
PATCH demands/{demand}/brief           demands.brief.edit       AiBriefController@saveEdit
```

## Test Suite Results

All 6 tests pass:
- `test_generate_without_anthropic_key_returns_back_with_error` — BYOK graceful degradation (D-33)
- `test_generate_with_valid_key_returns_event_stream_response` — SSE 200 + text/event-stream header
- `test_streamer_persists_brief_to_ai_analysis` — ai_analysis.brief written on generator exhaustion
- `test_patch_brief_updates_ai_analysis` — PATCH stores brief + brief_edited_at + brief_edited_by_user_id
- `test_patch_brief_rejects_empty` — validation returns 302 with session errors
- `test_generate_different_org_returns_403` — cross-org isolation (T-03-30)

## Known Stubs

None — BriefPromptBuilder reads real client.aiMemory() rows; falls back to neutral placeholder text when no memory exists (not a stub, intentional empty-state copy).

## Threat Flags

No new security surface beyond the plan's threat model (T-03-30 through T-03-35). All mitigations applied:
- T-03-30: `authorizeDemand` abort_if on both methods
- T-03-31: `UpdateBriefRequest` max:20000
- T-03-32: `brief_edited_by_user_id` stored on saveEdit

## Self-Check: PASSED

All 6 created files confirmed present on disk. All 3 task commits (9305300, 720451a, c65393c) confirmed in git log.
