---
phase: 03-ai-integration
plan: 11
subsystem: ui
tags: [react, typescript, inertia, planning, dashboard, sidebar, i18n]

requires:
  - phase: 03-ai-integration
    plan: 06
    provides: "MonthlyPlanningController 8 routes, CostConfirmModal, AiIcon"
  - phase: 03-ai-integration
    plan: 08
    provides: "AiIcon (full spec), i18n planning.* keys"

provides:
  - "Sidebar nav updated to /planejamento (Calendar icon, isActive via startsWith)"
  - "PlanningCard.tsx: 3 actions (convert/reject/redesign), redesign inline textarea, 4 status visual states, selection"
  - "Planejamento/Index.tsx: sticky header + client filter + month-grouped grid + generation modal + cost confirm + bulk bar + empty states"
  - "DashboardPlanningWidget.tsx: tomorrow/today/overdue reminder cards, localStorage dismissal, AiIcon size=32, max 3 + overflow link"
  - "DashboardController: planningReminderClients prop (org-scoped, whereNotNull planning_day)"
  - "Dashboard.tsx: renders DashboardPlanningWidget when clients present"
  - "i18n: planning.costConfirmBody key added to pt-BR, en, es"

affects: []

tech-stack:
  added: []
  patterns:
    - "usePage() cast as any to avoid Inertia PageProps constraint on nullable user — same as other pages in codebase"
    - "localStorage key pattern: planning_reminder_dismissed:{clientId}:{YYYY-MM}"
    - "forceUpdate counter (useState(0)) to trigger re-render after localStorage dismiss"
    - "groupByMonth: Map<string, PlanningDemand[]> keyed by toLocaleDateString label"
    - "Inline redesign: fetch POST (not router.post) to get JSON response for in-place update without page reload"

key-files:
  created:
    - resources/js/components/PlanningCard.tsx
    - resources/js/pages/Planejamento/Index.tsx
    - resources/js/components/DashboardPlanningWidget.tsx
  modified:
    - resources/js/components/Sidebar.tsx
    - resources/js/pages/Dashboard.tsx
    - app/Http/Controllers/DashboardController.php
    - resources/js/locales/pt-BR.json
    - resources/js/locales/en.json
    - resources/js/locales/es.json

key-decisions:
  - "usePage() cast to any in Planejamento/Index — Inertia's PageProps generic requires non-null User, but auth.user can be null in practice; safer to cast than to fight the type system"
  - "DashboardPlanningWidget uses forceUpdate pattern (not useCallback/useMemo) to re-render after localStorage dismiss — simplest correct approach"
  - "PlanningCard redesign uses native fetch (not router.post) — needs JSON response with updated suggestion fields for in-place update without full page reload"

requirements-completed: [MPLAN-03, MPLAN-04, MPLAN-05]

duration: 10min
completed: 2026-04-22
---

# Phase 03 Plan 11: /planejamento Page + Dashboard Widget + Sidebar Summary

**Full /planejamento page with month-grouped PlanningCards, generation modal with cost confirmation, bulk-convert bar, DashboardPlanningWidget with localStorage dismissal, and Sidebar nav update**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-04-22
- **Tasks:** 4 auto + 1 human-verify checkpoint
- **Files created:** 3
- **Files modified:** 6

## Accomplishments

- **Sidebar.tsx:** `/planning` → `/planejamento` href; `isActive` (startsWith) already works correctly
- **PlanningCard.tsx (189 lines):** checkbox + date chip, title/channel chip/description, 3 action buttons (Converter/Rejeitar/Redesenhar), inline redesign textarea with `fetch` POST for in-place JSON update, 4 visual status states (pending/accepted/rejected + selected ring), AiIcon spinner during apply, full i18n
- **Planejamento/Index.tsx (350 lines):** sticky header with client filter select + Gerar CTA (disabled when `has_anthropic_key === false` with tooltip), month-grouped list via `groupByMonth()`, generation modal with client select + month input + noQuota warning banner, cost estimation GET + CostConfirmModal D-34, bulk-convert floating bar when `selected.size >= 1`, empty states for no plannings and no client selected
- **DashboardPlanningWidget.tsx (144 lines):** computes `tomorrow/today/overdue` states per planning_day, filters dismissed clients via `localStorage.getItem()`, dismisses with `forceUpdate` re-render, renders up to 3 cards with AiIcon size=32, overflow link for more
- **DashboardController.php:** extended `index()` to query `planningReminderClients` — org-scoped, `whereNotNull('planning_day')`
- **Dashboard.tsx:** imports widget, accepts `planningReminderClients?` prop, renders conditionally in `mb-6` wrapper
- **i18n (3 locales):** added `planning.costConfirmBody` key (was missing, used by CostConfirmModal body)

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Sidebar nav /planejamento | `6f39b8b` |
| 2 | PlanningCard component | `dfe3cc1` |
| 3 | Planejamento/Index.tsx full page | `c35afdd` |
| 4 | DashboardPlanningWidget + Dashboard wire | `b3bd202` |
| fix | i18n costConfirmBody key (3 locales) | `db11e8a` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing i18n key] Added `planning.costConfirmBody` to all 3 locales**
- **Found during:** Post-task self-check (after Task 4)
- **Issue:** `Planejamento/Index.tsx` passes `t('planning.costConfirmBody', {count})` to `CostConfirmModal` body prop, but the key was absent from all 3 locale files
- **Fix:** Added `"costConfirmBody": "..."` to the `planning` namespace in `pt-BR.json`, `en.json`, `es.json`
- **Files modified:** `resources/js/locales/pt-BR.json`, `en.json`, `es.json`
- **Commit:** `db11e8a`

**2. [Rule 1 - Type fix] `usePage` generic removed to avoid Inertia PageProps constraint**
- **Found during:** Task 4 TypeScript check (`npx tsc --noEmit`)
- **Issue:** `usePage<PageProps>` where local `PageProps.auth.user` is nullable — Inertia's internal constraint requires `User` to be non-null, causing TS2344
- **Fix:** Changed to `usePage().props as any` with explicit `boolean` cast on the accessed value — matches pattern used in other pages where auth.user can be null at render time
- **Files modified:** `resources/js/pages/Planejamento/Index.tsx`
- **Commit:** `b3bd202` (included in Task 4 commit)

## Known Stubs

None — all components render real data from Inertia props. The page is fully functional pending Task 5 human verification.

## Pre-existing Issues (out of scope)

- `Settings/Ai.tsx` casing conflict (`@/layouts/AppLayout` vs `@/Layouts/AppLayout`) — documented in Plan 08 Summary as a pre-existing constraint on this Windows host. Not introduced or worsened by this plan.

## Threat Flags

No new network endpoints, auth paths, or schema changes beyond the plan's threat model.
- T-03-100: Bulk convert IDs — mitigated by backend (Plan 06) org-scope filter
- T-03-102: XSS in redesign response — mitigated: JSON parsed and bound via React text nodes, no `dangerouslySetInnerHTML`

## Self-Check: PASSED

All created files exist and all 5 commits (4 tasks + 1 fix) are present in git log.
