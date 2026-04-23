---
phase: 03-ai-integration
plan: 12b
type: execute
status: deferred
deferred_to: v1.2
wave: n/a
depends_on: [12]
created_at: 2026-04-23
autonomous: false
requirements: []
must_haves:
  truths:
    - "This plan is DEFERRED to v1.2 (milestone after v1.1 hackathon submission). Do NOT execute in Phase 3."
---

# Plan 12b — Managed Agent Live Timeline + Suggestion Review UI (DEFERRED)

> **⚠ This plan is DEFERRED to v1.2. It is documented here for forward reference.
> `/gsd-execute-phase 3` MUST NOT run this plan. The executor should skip files
> with `status: deferred` in frontmatter.**

## Why deferred

Per the Codex cross-AI review (03-REVIEWS.md, concern H6), Plan 12's original 7-task
scope was too large for the hackathon 4-day window. The split:

- **Plan 12 (v1.1 / hackathon):** MA wrapper + launch + polling + persist insights + badge + cost-confirm. Execute during Phase 3.
- **Plan 12b (v1.2 / deferred):** everything below. Do NOT execute in Phase 3.

## What this plan WOULD do (v1.2)

### Task 1 — SSE proxy for live MA event timeline

Controller `ClientResearchController@events` (`GET /clients/{client}/research/{session}/events`).
Streams a sanitized digest of Managed Agents events back to the browser. Under the hood it
opens an SSE connection to the MA events endpoint using the org's API key (never exposed
to the browser), decodes frames, redacts sensitive fields, and re-emits as a reduced event
stream (event_type, summary, timestamp). Includes reconnect-with-last-event-id support.

### Task 2 — `ClientResearchTimelineModal.tsx`

Modal component triggered from clicking the "🔍 Pesquisando" badge on `Clients/Index`.
Shows a reverse-chronological list of digested events from Task 1's SSE stream. Scrolls
as events arrive. Closes when user dismisses. Survives page navigation via portal mount.

### Task 3 — Suggestion review UI (`ClientAiMemoryPanel` Sugestões tab)

In the client detail view, add a new "Sugestões" tab alongside the existing memory tabs.
Lists all `client_ai_memory` rows where `status = 'suggested'` (insights written by the
MA with `confidence < 0.6`). Each row has two actions:

- **Aprovar** — `PATCH /clients/{client}/memory/{memory}/approve` → sets `status='active'`
- **Descartar** — `DELETE /clients/{client}/memory/{memory}` (or `status='dismissed'`)

Endpoints: `ClientAiMemoryController@approve` and `@dismiss`. Both authorize via `admin`
role + same-org scope.

### Task 4 — UI notification for MA session completion

In-app notification (reuses Phase 4 notifications table when that phase ships) that
surfaces "Pesquisa de {client} concluída — {N} insights adicionados, {M} sugestões para
revisar". Until Phase 4 is available, the notification is surfaced as a toast on next
page load.

## Entry condition to execute this plan in the future

1. v1.1 is shipped, accepted by the hackathon, and Phase 3 is verified complete
2. `client_research_sessions` production data shows ≥ 20 completed sessions (enough signal to justify the review UI investment)
3. v1.2 milestone is opened via `/gsd-new-milestone`
4. This plan is promoted to active by re-creating it as `03-XX-PLAN.md` in the new phase directory with `status: active`

---

*Generated during Phase 3 planning (2026-04-23) as a deferral marker. No tasks execute.*
