---
phase: 03-ai-integration
plan: 13
subsystem: ai-observability
tags: [opentelemetry, otel, redis, middleware, telemetry, observability, spanemitter]

# Dependency graph
requires:
  - phase: 03-ai-integration
    plan: 04
    provides: "BriefStreamer + AnthropicClientInterface"
  - phase: 03-ai-integration
    plan: 05
    provides: "ChatStreamer"
  - phase: 03-ai-integration
    plan: 06
    provides: "MonthlyPlanGenerator + ItemRedesigner"
  - phase: 03-ai-integration
    plan: 07
    provides: "ClientMemoryExtractor + ConversationCompactor"
  - phase: 03-ai-integration
    plan: 12
    provides: "ClientResearchAgent (MA)"

provides:
  - "SpanEmitter: emit(capability, org_id, attrs, callable) — OTEL span wrapper, silent no-op when SDK absent"
  - "SpanEmitter: recordUsage() — logs ai.usage + increments Redis ai:calls + ai:cost_usd per org per day"
  - "AiUsageMeter middleware: increments Redis ai:http_calls per org per day; logs soft-limit warning at 500 calls"
  - "OTEL SDK optional install: open-telemetry/sdk, exporter-otlp, api, php-http/guzzle7-adapter in composer.json"
  - "services.otel config block (enabled, endpoint, service_name)"
  - ".env.example: OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_SERVICE_NAME, OTEL_PHP_AUTOLOAD_ENABLED, model tier vars"
  - "All 6 AI services wired: BriefStreamer, ChatStreamer, MonthlyPlanGenerator, ClientMemoryExtractor, ItemRedesigner, ConversationCompactor"
  - "ai.meter middleware alias registered in bootstrap/app.php; applied to brief/generate, chat/stream, planejamento/generate, planning/redesign, settings/ai/test routes"

affects:
  - app/Services/Ai/BriefStreamer.php
  - app/Services/Ai/ChatStreamer.php
  - app/Services/Ai/MonthlyPlanGenerator.php
  - app/Services/Ai/ClientMemoryExtractor.php
  - app/Services/Ai/ItemRedesigner.php
  - app/Services/Ai/ConversationCompactor.php
  - app/Http/Middleware/AiUsageMeter.php
  - app/Services/Ai/Telemetry/SpanEmitter.php
  - bootstrap/app.php
  - config/services.php
  - .env.example
  - composer.json

# Tech stack
tech_stack:
  added:
    - open-telemetry/sdk ^1.0
    - open-telemetry/exporter-otlp ^1.0
    - open-telemetry/api ^1.0
    - php-http/guzzle7-adapter ^1.0
  patterns:
    - "Optional telemetry: class_exists guard on OpenTelemetry\\API\\Globals — no-op when SDK absent"
    - "try/catch no-op on all telemetry paths (T-03-121)"
    - "Redis::incr + expire pattern for per-org per-day counters"
    - "SpanEmitter injected via Laravel DI constructor injection (auto-resolved singleton)"

# Key files
key_files:
  created:
    - app/Services/Ai/Telemetry/SpanEmitter.php
    - app/Http/Middleware/AiUsageMeter.php
  modified:
    - composer.json
    - config/services.php
    - .env.example
    - bootstrap/app.php
    - routes/web.php
    - app/Services/Ai/BriefStreamer.php
    - app/Services/Ai/ChatStreamer.php
    - app/Services/Ai/MonthlyPlanGenerator.php
    - app/Services/Ai/ClientMemoryExtractor.php
    - app/Services/Ai/ItemRedesigner.php
    - app/Services/Ai/ConversationCompactor.php

# Decisions
decisions:
  - "Per-route ai.meter middleware (not group consolidation) — avoids disrupting route name stability across 13 plans"
  - "SpanEmitter as auto-resolved DI singleton — no explicit AppServiceProvider binding needed"
  - "Redis expire set only on first incr (count===1) to avoid resetting TTL on every call"
  - "Task 4 (human-verify Phoenix checkpoint) auto-approved — plan flagged autonomous"

# Metrics
metrics:
  duration_minutes: 4
  completed_date: "2026-04-23"
  tasks_completed: 4
  tasks_total: 4
  files_created: 2
  files_modified: 11
---

# Phase 03 Plan 13: AI Usage Meter + Observability Summary

**One-liner:** Optional OpenTelemetry instrumentation + Redis call counters wired across all 6 Phase 3 AI services via SpanEmitter singleton and AiUsageMeter HTTP middleware.

## What Was Built

### SpanEmitter (`app/Services/Ai/Telemetry/SpanEmitter.php`, 184 lines)

- `emit(capability, org_id, attrs, callable)` — wraps any AI callable in an OTEL span. If `open-telemetry/api` is absent or `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, the callable runs without instrumentation. All span errors are caught and logged at `debug` level — never propagated.
- `recordUsage(capability, org_id, attrs, inputTokens, outputTokens, durationMs)` — logs `ai.usage` (always) and increments Redis `ai:calls:{org}:{date}` and `ai:cost_usd:{org}:{date}` counters (TTL 7 days). Cost estimated from `PRICE_PER_MTOK` table (AI-SPEC §4: opus $15/$75, sonnet $3/$15, haiku $1/$5 per MTok).

### AiUsageMeter middleware (`app/Http/Middleware/AiUsageMeter.php`, 75 lines)

- Increments `ai:http_calls:{org}:{date}` Redis counter on every AI HTTP request.
- Logs `ai.soft_limit_reached` warning at 500 calls/day/org — log-only, never blocks (Phase 3 posture per AI-SPEC §5).
- Logs `ai.http` with route name, org ID, user ID, duration, HTTP status, daily count.
- All failures caught silently (T-03-121: Redis failures must not cascade).

### OTEL SDK install

`open-telemetry/sdk`, `open-telemetry/exporter-otlp`, `open-telemetry/api`, `php-http/guzzle7-adapter` added to `composer.json` and installed in `vendor/`. The install succeeded in the worktree environment.

### Config + env

- `config/services.php`: new `otel` block with `enabled`, `endpoint`, `service_name`.
- `.env.example`: `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `OTEL_PHP_AUTOLOAD_ENABLED`, plus model tier vars (`ANTHROPIC_MODEL_COMPLEX/CHAT/CHEAP`).

### Service wiring (6 services)

All services received a `SpanEmitter $emitter` constructor parameter (Laravel DI auto-resolves):

| Service | Capability | Model tier | Notes |
|---------|-----------|-----------|-------|
| BriefStreamer | `brief` | sonnet | `emit` wraps `createStream`; `recordUsage` on `message_stop` |
| ChatStreamer | `chat` | sonnet | same streaming pattern |
| MonthlyPlanGenerator | `monthly_plan` | opus | `emit` + `recordUsage` per retry attempt |
| ClientMemoryExtractor | `memory_extract` | haiku | sync call wrapped |
| ItemRedesigner | `redesign` | haiku | sync call wrapped |
| ConversationCompactor | `compact` | haiku | sync call wrapped |

### Route middleware

`ai.meter` alias registered in `bootstrap/app.php`. Applied per-route to:
- `demands.brief.generate`
- `demands.chat.stream`
- `planejamento.generate`
- `planning-suggestions.redesign`
- `settings.ai.test`

## Commits

| Hash | Message |
|------|---------|
| `7ea4bca` | feat(03-13): SpanEmitter + OTEL SDK + env template |
| `21d35c3` | feat(03-13): AiUsageMeter middleware + register on AI routes |
| `61fa3c2` | feat(03-13): wire SpanEmitter into all 6 AI services |

## Deviations from Plan

### Auto-approved checkpoint

**Task 4 [HUMAN]: Run Phoenix locally + verify spans** — auto-approved per `<important_context>` directive. Phoenix verification is a deploy-time step; the telemetry is strictly opt-in and gracefully degrades to log-only when the endpoint is unconfigured.

### Per-route vs group consolidation

**Plan suggested** consolidating all AI routes into a single `->group(['middleware' => 'ai.meter'])` block, which would have required moving ~15 routes from their current positions (plans 04/05/06/12 placed them in separate blocks).

**Applied instead:** `->middleware('ai.meter')` per AI-mutating route. Same coverage, zero risk of breaking route names or Inertia partial reloads that rely on named routes.

## OTEL Install Status

OTEL PHP SDK installed successfully. The `open-telemetry/api`, `open-telemetry/sdk`, `open-telemetry/exporter-otlp`, and `php-http/guzzle7-adapter` packages are present in `vendor/` and `composer.json`.

To activate spans export to Arize Phoenix:
1. Run `docker run -d --name phoenix -p 6006:6006 -p 4317:4317 arizephoenix/phoenix:latest`
2. Set in `.env`: `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317`
3. Restart the dev server

Without this configuration, `services.otel.enabled` evaluates to `false` (env var is `null`) and all telemetry is silent no-op — Briefy functions normally.

## Redis Degradation Behaviour

If Redis is unavailable:
- `SpanEmitter::recordUsage()` catches the exception and logs `ai.usage_redis_failed` at `debug` level — `ai.usage` log entry still written
- `AiUsageMeter::handle()` catches the exception and logs `ai_meter.failed` at `debug` level — HTTP response still returned normally
- No AI functionality is blocked

## Phase 3 Close-out

Plan 13 is the final plan in Phase 3 (AI Integration). All 13 plans shipped:

| Plan | Summary |
|------|---------|
| 01 | BYOK factory + AnthropicClientInterface |
| 02 | Wave 0 migrations |
| 03 | (research/validation) |
| 04 | BriefStreamer + SSE controller |
| 05 | ChatStreamer + conversation model |
| 06 | MonthlyPlanGenerator + ItemRedesigner + planning UI |
| 07 | ClientMemoryExtractor + ConversationCompactor + jobs |
| 08 | Shared AI frontend hooks + i18n |
| 09 | Dashboard + metrics |
| 10 | Onboarding flow |
| 11 | Real-time Reverb broadcasting |
| 12 | ClientResearchAgent (Managed Agents) |
| 13 | AI Usage Meter + Observability (this plan) |

## Known Stubs

None — all telemetry paths are real implementations (log + Redis counters). OTEL spans are optional but fully implemented; they activate automatically when the SDK is present and endpoint is configured.

## Threat Flags

No new network endpoints or auth paths introduced. `AiUsageMeter` reads `organization_id` from the authenticated user session only (not from request input) — no injection surface. OTEL endpoint is server-controlled via `.env` (T-03-122: accept disposition confirmed).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `app/Services/Ai/Telemetry/SpanEmitter.php` | FOUND |
| `app/Http/Middleware/AiUsageMeter.php` | FOUND |
| commit `7ea4bca` (Task 1) | FOUND |
| commit `21d35c3` (Task 2) | FOUND |
| commit `61fa3c2` (Task 3) | FOUND |
