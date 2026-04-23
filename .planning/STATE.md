---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: — AI + Real-time + Dashboard
status: executing
stopped_at: Completed 03-07-PLAN.md (Memory extraction + compaction) — Plan 08 next
last_updated: "2026-04-23T02:34:00Z"
last_activity: 2026-04-23 — Plan 07 (Memory extraction + compaction) complete
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 14
  completed_plans: 8
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Agency teams can create, track, and complete client demands efficiently, with AI accelerating brief creation.
**Current focus:** Milestone v1.1 — Phase 3: AI Integration

## Current Position

Phase: 3 — AI Integration
Plan: 03-08 (Plans 01, 04, 05, 06, 07 complete)
Status: In progress
Last activity: 2026-04-23 — Plan 07 (Memory extraction + compaction) complete

Progress: [█████░░░░░] 57% (v1.0 complete: 2/5 phases; v1.1 Phase 3 in execution)

## Performance Metrics

**Velocity:**

- Total plans completed: ~12 (estimated, phases 1-2)
- v1.0 phases: 2 phases shipped

*Metrics will be tracked starting v1.1*

## Accumulated Context

### Decisions

- Phase 1–2: Inertia partial reloads (`only: [...]`) for modal actions — keep pattern for AI responses
- Phase 2: Inline PATCH routes (no redirect) for modal edits — extend to AI actions
- Phase 2: `useEffect` sync for KanbanBoard — reuse pattern for real-time broadcast updates (Phase 4)
- Phase 2: Deadline `substring(0,10)` for date inputs — established convention
- v1.1 AI: Use Anthropic PHP SDK (`anthropic-ai/sdk` on Packagist, v0.16.0) direct API calls — no Prism abstraction
- v1.1 AI: Streaming via Laravel streaming response + React EventSource/fetch for SSE
- v1.1 AI: `ai_memory` table already exists — load client memory before each AI call, update after
- v1.1 BYOK: AnthropicClientInterface + AnthropicClientFactory (forOrganization) — per-org key resolution, abort 402 if no key
- v1.1 BYOK: Tests bind AnthropicClientInterface fake via $app->instance() — no subclassing of final SDK classes (H5)
- v1.1 Streaming: BriefStreamer accepts AnthropicClientInterface (not \Anthropic\Client) — factory returns interface
- v1.1 Streaming: BriefStreamer is NOT final — allows anonymous test double subclasses
- v1.1 Streaming: SSE test split pattern — assertStatus+content-type without sendContent; persistence via direct generator exhaustion
- v1.1 Streaming: forceFill() required to write anthropic_api_key_encrypted past $fillable in tests
- v1.1 BYOK: dontFlash lives in bootstrap/app.php (Laravel 11+) — no Handler.php in this project
- v1.1 BYOK: MA probe uses GET /v1/agents?limit=0 — zero tokens consumed, checks HTTP status only
- v1.1 RT: Laravel Reverb for WebSockets — `php artisan reverb:install`
- v1.1 RT: Frontend subscribes to `private-organization.{org_id}` channel via laravel-echo + pusher-js
- v1.1 Dashboard: Recharts or react-chartjs-2 for charts (lightweight, no heavy dependencies)
- v1.1 Onboarding: Check for 0 clients or 0 demands; store `onboarding_dismissed` in user preferences JSON column
- v1.1 Chat: ChatStreamer accepts AnthropicClientInterface (not \Anthropic\Client) — same BYOK factory pattern as BriefStreamer
- v1.1 Chat: ChatStreamer is NOT final — allows anonymous test double subclasses
- v1.1 Chat: Two-block system prompt — stable cached prefix (ephemeral) + volatile comments tail outside cache (80% cache hits on turns 2..N)
- v1.1 Chat: User message persisted BEFORE eventStream() opens — survives client disconnect (AI-SPEC pattern b)
- v1.1 Chat: Job stubs (ExtractClientMemoryJob, CompactConversationJob) in app/Jobs/ — dispatch() works, full impl Plan 07 (DONE)
- v1.1 Memory: ClientMemoryExtractor NOT final — anonymous subclass test doubles; accepts AnthropicClientInterface (BYOK pattern)
- v1.1 Memory: 4-gate pipeline — schema, confidence ≥0.6, PII scrub (CPF/CNPJ/email/BR phone), idempotent upsert by insight_hash
- v1.1 Memory: client_id for upsert always from $demand->client — never from tool output (T-03-62)
- v1.1 Memory: CompactConversationJob re-checks threshold before acting (guard against double-dispatch)
- v1.1 Memory: AiConversation.organization() BelongsTo added (was missing, needed by jobs for BYOK key resolution)
- v1.1 Testing: pgsql-schema.sql must be non-empty for RefreshDatabase to load test DB — regenerate with php artisan schema:dump
- v1.1 Planning: MonthlyPlanGenerator + ItemRedesigner accept AnthropicClientInterface (not \Anthropic\Client) — consistent H5 pattern
- v1.1 Planning: MonthlyPlanSchema toolSchema() enforces minItems/maxItems=$expectedCount — two-gate validation with Laravel validator rules
- v1.1 Planning: CostConfirmModal shared component (D-34) at resources/js/Components/CostConfirmModal.tsx — reused by Plan 11 + 12
- v1.1 Planning: AiIcon component at resources/js/Components/AiIcon.tsx — dark/light SVG pair wrapper for all AI UI (D-15)

### Pending Todos

- Configure Anthropic API key in `.env` (ANTHROPIC_API_KEY) for dev/test fallback (forTesting())
- anthropic-ai/sdk ^0.16.0 confirmed installed in vendor/ (Wave 0)
- Run `php artisan reverb:install` before starting Phase 4

### Blockers/Concerns

- Anthropic API key must be available in environment for AI calls to work
- Laravel Reverb dev server must run alongside `php artisan serve` in development

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Billing | Subscription/payment system | Deferred | v1.0 |
| Mobile | Native app | Deferred | v1.0 |
| Portal | Client-facing login | Deferred | v1.0 |
| AI | Suggest status transitions from comments | Deferred v2 | v1.1 planning |
| AI | Summarize comments into digest | Deferred v2 | v1.1 planning |
| AI | Multi-turn session history per demand | Deferred v2 | v1.1 planning |
| Real-time | Live cursor/presence on Kanban | Deferred v2 | v1.1 planning |
| Real-time | Demand locking during edit | Deferred v2 | v1.1 planning |

## Session Continuity

Last session: 2026-04-23
Stopped at: Completed 03-07-PLAN.md (Memory extraction + compaction) — Plan 08 next
Resume file: None
