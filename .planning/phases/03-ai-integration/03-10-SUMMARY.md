---
phase: 03-ai-integration
plan: 10
subsystem: client-form-monthly-plan
tags: [client, form, monthly-plan, badges, managed-agent]
dependency_graph:
  requires: [03-01, 03-02, 03-03, 03-08]
  provides: [client-monthly-plan-ui, client-social-handles-ui, client-badges, ma-launch-button]
  affects: [ClientForm, Clients/Index, ClientController, Clients/Create, Clients/Edit]
tech_stack:
  added: []
  patterns:
    - Extended form with typed interface additions (FormData + Props)
    - Inertia eager-load with map() for computed fields
    - Conditional MA button (isEditMode + has_anthropic_key gate + social_handles gate)
key_files:
  created: []
  modified:
    - resources/js/Components/ClientForm.tsx
    - resources/js/pages/Clients/Create.tsx
    - resources/js/pages/Clients/Edit.tsx
    - resources/js/pages/Clients/Index.tsx
    - app/Http/Controllers/ClientController.php
decisions:
  - Edit.tsx uses post() with data override for social_handles cleaning (strips empty strings before submit) instead of form.transform() to avoid mutation side-effects on re-renders
  - MA launch button logic extracted to top of ClientForm component (not inline IIFE) for clarity and React rules compliance
  - active_research_session statuses: queued, running, idle — matches Plan 02 ClientResearchSession model
metrics:
  duration: ~10 min
  completed: "2026-04-23T02:44:14Z"
  tasks_completed: 2
  files_modified: 5
---

# Phase 03 Plan 10: Client Form Monthly Plan + Index Badges Summary

**One-liner:** Extended ClientForm with monthly plan section (monthly_posts, monthly_plan_notes, planning_day), social_handles grid, and gated MA launch button; Clients/Index now shows posts/mês badge (Calendar icon) and active research session badge (spinning AiIcon).

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Extend ClientForm with monthly plan section + social_handles + MA button | f0aa402 | ClientForm.tsx, Create.tsx, Edit.tsx |
| 2 | Clients/Index badges + ClientController::index eager load | 47ffa1e | Index.tsx, ClientController.php |

## What Was Built

### Task 1 — ClientForm extensions

- **FormData interface** extended with `monthly_posts`, `monthly_plan_notes`, `planning_day`, `social_handles` (all optional/nullable)
- **Props interface** extended with `client?: { id: number } | null` and `isEditMode?: boolean`
- **Plano de Conteúdo Mensal section** appended after avatar field with border-t divider, section title/subtitle, and 3 fields using existing `inputClass`/`textareaClass`/`labelClass` constants
- **Presença Digital section** with a 2-column grid of 5 platform inputs (website, instagram, linkedin, facebook, tiktok)
- **MA launch button** (type="button") rendered only in `isEditMode`, gated on `has_anthropic_key` from `usePage().props.auth.organization` AND at least one non-empty social handle. Disabled state shows tooltip. Routes to `clients.research.launch` via `router.post()`.
- **Create.tsx** — useForm extended with 4 new fields, `isEditMode={false}` passed explicitly
- **Edit.tsx** — Client interface extended with 4 new fields, useForm picks them from `client` prop, submit strips empty social_handles entries before sending

### Task 2 — Badges + Controller

- **Clients/Index** — `ActiveResearchSession` and `Client` interfaces updated. Two badges rendered in each card below client name:
  - `{count} posts/mês` badge (Calendar 11px, purple pill) — shown when `monthly_posts > 0`
  - `🔍 Pesquisando — ~XX min restantes` badge (spinning AiIcon 12px) — shown when `active_research_session` present
- **ClientController::index** — adds `with(['researchSessions' => fn($q) => $q->latest()->limit(1)])`, maps over results to compute `active_research_session` object (statuses: queued/running/idle, 30-min estimated target heuristic)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced inline IIFE pattern for MA button with extracted variables**
- **Found during:** Task 1 implementation
- **Issue:** Plan suggested an IIFE `{isEditMode && (() => { ... })()}` pattern which violates React rules (hooks inside non-hook functions) since `usePage()` is called inside
- **Fix:** Extracted `hasKey`, `hasSources`, `maDisabled` as top-level variables in the component body; `isEditMode` block only conditionally renders JSX
- **Files modified:** resources/js/Components/ClientForm.tsx
- **Commit:** f0aa402

**2. [Rule 1 - Bug] Used post() with data override instead of form.transform() for social_handles cleaning**
- **Found during:** Task 1, Edit.tsx
- **Issue:** `form.transform()` mutates internal Inertia form state globally and would apply to all future submits in the component lifecycle
- **Fix:** Compute `cleanedHandles` inline in the submit handler and pass as `data` override to `post()`
- **Files modified:** resources/js/pages/Clients/Edit.tsx
- **Commit:** f0aa402

## Known Stubs

None — all fields are wired to real form state and submitted to backend. The MA launch button points to `clients.research.launch` which is wired up in Plan 12.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-03-90 (accepted) | ClientForm.tsx | social_handles JSON keys are user-controlled; Plan 02 StoreClientRequest/UpdateClientRequest validates them as strings max:255 |
| T-03-91 (accepted) | ClientController.php | active_research_session.id exposed in page props; org-scoped, no cross-org leak possible |

## Self-Check: PASSED

- All 5 modified files exist on disk
- Commits f0aa402 and 47ffa1e verified in git log
