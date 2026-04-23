# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Agency teams can create, track, and complete client demands efficiently, with AI accelerating brief creation.
**Current focus:** Milestone v1.1 — Phase 3: AI Integration

## Current Position

Phase: 3 — AI Integration
Plan: Planned (13 plans in 4 waves)
Status: Ready to execute
Last activity: 2026-04-22 — Phase 3 plans created and verified (2 revision iterations; 12/12 REQ-IDs covered; 40/40 decisions mapped)

Progress: [████░░░░░░] 40% (v1.0 complete: 2/5 phases; v1.1 Phase 3 planned, execution pending)

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
- v1.1 AI: Use Anthropic PHP SDK (`anthropics/anthropic-sdk-php`) direct API calls — no Prism abstraction
- v1.1 AI: Streaming via Laravel streaming response + React EventSource/fetch for SSE
- v1.1 AI: `ai_memory` table already exists — load client memory before each AI call, update after
- v1.1 RT: Laravel Reverb for WebSockets — `php artisan reverb:install`
- v1.1 RT: Frontend subscribes to `private-organization.{org_id}` channel via laravel-echo + pusher-js
- v1.1 Dashboard: Recharts or react-chartjs-2 for charts (lightweight, no heavy dependencies)
- v1.1 Onboarding: Check for 0 clients or 0 demands; store `onboarding_dismissed` in user preferences JSON column

### Pending Todos

- Configure Anthropic API key in `.env` before starting Phase 3
- Confirm `anthropics/anthropic-sdk-php` is installed (`composer require anthropics/anthropic-sdk-php`)
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

Last session: 2026-04-22
Stopped at: v1.1 roadmap created — ready to run `/gsd-plan-phase 3`
Resume file: None
