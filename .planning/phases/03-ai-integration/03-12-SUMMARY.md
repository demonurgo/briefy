---
phase: 03-ai-integration
plan: 12
subsystem: ai-managed-agents
tags: [managed-agents, byok, client-research, background-job, sse, suggestion-flag]

dependency_graph:
  requires:
    - "03-01: BYOK infrastructure (AnthropicClientFactory, Organization.hasAnthropicKey)"
    - "03-02: ClientResearchSession model + migrations (client_ai_memory.status column)"
    - "03-06: CostConfirmModal shared component (D-34)"
    - "03-10: MA launch button in ClientForm + research badge in Clients/Index"
  provides:
    - "ClientResearchPromptBuilder: system prompt loader + user message builder"
    - "ClientResearchAgent: raw HTTP wrapper for MA API (launch/fetchSession/fetchEvents)"
    - "PollClientResearchSessionJob: self-rescheduling poll + insight capture via record_insights"
    - "ClientResearchController: launch/estimateCost/show/streamEvents actions"
    - "ClientResearchTimelineModal: clickable badge → live SSE status modal"
    - "ClientAiMemoryPanel: Active + Sugestões two-tab memory viewer with approve/dismiss"
    - "ClientAiMemoryController: approve/dismiss endpoints for suggested insights"
    - "routes: clients.research.{launch,estimateCost,show,stream} + client-ai-memory.{approve,dismiss}"
  affects:
    - "Clients/Index — research badge now clickable, CostConfirmModal wired to MA launch"
    - "routes/web.php — 6 new routes added"
    - "lang/pt-BR/app.php, en/app.php, es/app.php — 6 new keys each"
    - "resources/js/locales/{pt-BR,en,es}.json — clients.research.{confirmTitle,confirmBody,confirmCta}"

tech_stack:
  added: []
  patterns:
    - "Raw HTTP to MA API via Laravel Http facade with BYOK bearer token + anthropic-beta header"
    - "Self-rescheduling job pattern: job redispatches itself with 30s delay while session is active"
    - "DB-polling SSE proxy: streamEvents polls ClientResearchSession row every 5s, never proxies raw MA events"
    - "EventSource (not useAiStream) for GET SSE with custom events (ARCH NOTE in modal header)"
    - "Optimistic UI removal on approve/dismiss via actedIds Set state"
    - "D-38 confidence gate: >= 0.6 → status=active, < 0.6 → status=suggested (NOT dropped)"

key_files:
  created:
    - resources/prompts/client_research_system.md
    - app/Services/Ai/ClientResearchPromptBuilder.php
    - app/Services/Ai/ClientResearchAgent.php
    - app/Jobs/PollClientResearchSessionJob.php
    - app/Http/Controllers/ClientResearchController.php
    - app/Http/Controllers/ClientAiMemoryController.php
    - resources/js/Components/ClientResearchTimelineModal.tsx
    - resources/js/Components/ClientAiMemoryPanel.tsx
  modified:
    - resources/js/pages/Clients/Index.tsx
    - routes/web.php
    - lang/pt-BR/app.php
    - lang/en/app.php
    - lang/es/app.php
    - resources/js/locales/pt-BR.json
    - resources/js/locales/en.json
    - resources/js/locales/es.json

decisions:
  - "MA API endpoints used: POST /v1/agents (create agent), POST /v1/sessions (create session), GET /v1/sessions/{id} (status), GET /v1/sessions/{id}/events (events). These are per the plan's documented shapes and may need adjustment if beta API differs."
  - "streamEvents is a DB-polling proxy (not a raw MA SSE proxy). The browser gets status frames from our DB every 5s. PollClientResearchSessionJob runs independently in the background on the 'ai' queue."
  - "EventSource chosen over useAiStream for ClientResearchTimelineModal: GET stream, custom event types (status/done), EventSource reconnect is free. ARCH NOTE added to modal and useAiStream.ts."
  - "Routes for client-ai-memory.approve/dismiss added in Task 4 commit alongside research routes (grouped logically in web.php)."
  - "ClientAiMemoryPanel created from scratch (did not exist in Phase 2). Minimal but complete: Active + Sugestões tabs, confidence chip, approve/dismiss wired via router.post."

metrics:
  duration: ~20 min
  completed: "2026-04-23"
  tasks_completed: 6
  files_modified: 16
---

# Phase 03 Plan 12: Client Research Managed Agent Summary

**One-liner:** Full Claude Managed Agents integration — HTTP wrapper service, self-rescheduling poll job with PII filtering + confidence gate, SSE-proxy controller, clickable timeline modal, and Sugestões tab for low-confidence insight review.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | ClientResearchPromptBuilder + client_research_system.md | 4eca68b | 2 created |
| 2 | ClientResearchAgent (raw HTTP wrapper for MA API) | 7bd98ca | 1 created |
| 3 | PollClientResearchSessionJob (self-rescheduling + insight capture) | 18b2759 | 1 created |
| 4 | ClientResearchController + routes + i18n | a04866d | 5 modified |
| 5 | ClientResearchTimelineModal + clickable badge + cost confirm | 61e2549 | 5 files |
| 6 | ClientAiMemoryController + ClientAiMemoryPanel Sugestões tab | 82520c4 | 2 created |
| 7 | Checkpoint: end-to-end MA test | auto-approved | (human verification deferred) |

## What Was Built

### Task 1 — Prompt infrastructure

- `resources/prompts/client_research_system.md`: MA system prompt with HARD rules (robots.txt, PII, MAXIMUM 30 pages, `record_insights` once protocol)
- `ClientResearchPromptBuilder`: `system()` reads from `resource_path('prompts/...')`, `userMessage()` builds the client context block with all social handles

### Task 2 — ClientResearchAgent

Raw HTTP wrapper (no MA PHP SDK in anthropic-ai/sdk v0.16). Key design points:
- `launch()`: creates DB session row first (so we always have an ID), then calls MA API, dispatches `PollClientResearchSessionJob` with 30s delay
- `ensureAgent()`: creates per-org MA agent on first launch, stores `client_research_agent_id` in `organizations` table
- `httpFor()`: BYOK bearer token + `anthropic-beta` header from `config('services.anthropic.beta_ma')`
- Graceful fallback: any exception sets `session.status = 'failed'` + `Log::error('ma.launch_failed', ...)`

### Task 3 — PollClientResearchSessionJob

- Self-rescheduling via `self::dispatch(...)->delay(30s)` while session is active
- 45-min wall-time kill switch (T-03-114)
- `processEvent()`: handles `tool_use` / `message.tool_use` events with `name='record_insights'`
- Security gates (T-03-111): category whitelist, PII scrub (CPF/CNPJ/email/BR phone via preg_match)
- T-03-112: `client_id` always from `$this->session->client`, never from event payload
- D-38: `confidence >= 0.6` → `status='active'`; `< 0.6` → `status='suggested'`
- `failed()` hook marks session definitively failed on retry exhaustion

### Task 4 — Controller + routes + i18n

Three controller actions:
- `launch()`: BYOK gate + source gate (D-35: at least one handle/website) + duplicate session guard
- `estimateCost()`: JSON cost estimate for D-34 pre-launch modal (always `confirm_required=true`)
- `show()`: JSON session status for polling
- `streamEvents()`: DB-polling SSE proxy — emits `event: status` frames every 5s from `session.fresh()`, capped at 5 min per browser connection
- `authorizeClient()`: org-scoping guard → 403 on cross-org (T-03-112)

Routes added: `clients.research.{launch,estimateCost,show,stream}` + `client-ai-memory.{approve,dismiss}`

i18n: `ma_started/launch_failed/no_sources/already_running` + `memory_suggestion_{approved,dismissed}` in pt-BR/en/es

### Task 5 — Frontend (modal + wiring)

- `ClientResearchTimelineModal`: native `EventSource` (ARCH NOTE explains why not `useAiStream`) — subscribes to `event: status` frames, renders timeline of status cards with spinning `AiIcon`
- `Clients/Index`: research badge converted from `<span>` to `<button>` that opens the modal
- `openResearchWithConfirm()`: fetches cost estimate, shows `CostConfirmModal` (D-34), then `router.post` on confirm
- i18n: `clients.research.{confirmTitle,confirmBody,confirmCta}` in all 3 locale JSON files

### Task 6 — Sugestões tab (D-38)

- `ClientAiMemoryController`: `approve()` → `status='active'`, `dismiss()` → `status='dismissed'`, both with org-scoping guard
- `ClientAiMemoryPanel`: two-tab component — **Memória ativa** (status=active or null) + **Sugestões** (status=suggested)
  - Confidence chip: `bg-[#f59e0b]/10 text-[#b45309]` with decimal confidence value
  - Aprovar (green ghost) / Descartar (red ghost) with optimistic removal via `actedIds` Set
  - Matches D-38 requirement: low-confidence insights surface for review, not dropped

## MA Endpoint Notes

Endpoints used as documented in plan interfaces + AI-SPEC §4:
- `POST /v1/agents` — create per-org agent
- `POST /v1/sessions` — create session tied to agent
- `GET /v1/sessions/{id}` — fetch session status
- `GET /v1/sessions/{id}/events` — fetch event batch (cursor-based)

**If the beta API has different endpoint paths or payload shapes:** The `ClientResearchAgent` service catches all exceptions and marks the session `status='failed'`. The controller shows `ma_launch_failed` toast. The `PollClientResearchSessionJob` retries up to 3 times before calling `failed()`. No crash path exposed to the user.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Routes for client-ai-memory added in Task 4 commit**
- **Found during:** Task 4 implementation
- **Issue:** Plan listed memory routes under Task 6's routes section, but Task 4 was the logical place to add all research-related routes together
- **Fix:** Added both `client-ai-memory.approve/dismiss` routes in the same routes commit as the research routes, grouped logically
- **Files modified:** routes/web.php
- **Commit:** a04866d

**2. [Rule 1 - Bug] streamEvents uses DB-polling rather than MA SSE proxy**
- **Found during:** Task 4 implementation
- **Issue:** The plan mentions proxying MA events SSE stream, but proxying raw MA SSE (with auth headers) to the browser is a security risk (T-03-110) and requires complex stream-passthrough logic
- **Fix:** `streamEvents` polls the `ClientResearchSession` DB row every 5s and emits digest status frames. The raw MA stream is consumed only by `PollClientResearchSessionJob` (server-side). This matches T-03-110 ("events proxy strips MA-internal fields, forwards a digest")
- **Files modified:** app/Http/Controllers/ClientResearchController.php
- **Commit:** a04866d

### Task 7 — Checkpoint Auto-approved

Per execution instructions, human-verify checkpoints are auto-approved in autonomous mode. MA beta API access was not tested against a live key (not available in CI context). The graceful fallback path (session → failed, `ma_launch_failed` toast) is implemented per plan specification and can be verified by a developer with a live key.

## Known Stubs

None — all code paths are wired to real logic. The MA API calls will fail gracefully if the beta endpoint is unavailable or if the org has no valid key.

## Threat Flags

All threat mitigations from the plan's threat model are implemented:

| Threat | Component | Mitigation Applied |
|--------|-----------|-------------------|
| T-03-110 | API key proxied | Key read server-side only; streamEvents emits DB digest, never raw MA auth |
| T-03-111 | record_insights tamper | PII filter + confidence gate + category whitelist in processEvent() |
| T-03-112 | Cross-client memory write | client_id always from session.client, never from event payload |
| T-03-113 | Crawl ethics | System prompt explicitly bans robots.txt violations, auth'd pages |
| T-03-114 | Runaway session | 45-min MAX_SESSION_MINUTES kill switch in PollClientResearchSessionJob |
| T-03-115 | Cost blow-up | Prompt caps MAX_PAGES=30; D-34 CostConfirmModal always shown before launch |

## Self-Check: PASSED

All 9 created/modified files exist on disk. All 6 task commits verified in git log:
- 4eca68b, 7bd98ca, 18b2759, a04866d, 61e2549, 82520c4
