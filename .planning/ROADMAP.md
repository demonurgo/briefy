# Roadmap: Briefy

**Project:** Briefy — B2B SaaS for marketing agencies
**Core Value:** Agency teams can create, track, and complete client demands efficiently, with AI accelerating brief creation.

---

## Milestones

- ✅ **v1.0 — Core Platform** — Phases 1–2 (shipped 2026-04-22)
- ✅ **v1.1 — AI + Team + Dashboard** — Phases 3–5 (shipped 2026-04-24)
- **v1.2 — Real-time + Polish** — Phases 6–8 (in progress)
  - Phase 7 substituída: Notifications → Mobile + PWA (prioridade ajustada em 2026-04-24)

## Phases

<details>
<summary>✅ v1.0 — Core Platform (Phases 1–2) — SHIPPED 2026-04-22</summary>

- [x] Phase 1: Auth + Org + Layout — Multi-tenant auth, organization creation, sidebar, i18n, dark mode
- [x] Phase 2: Clients + Demands — Client CRUD, demand CRUD, Kanban board, list view, detail modal, files, comments

See full details: `.planning/milestones/v1.1-ROADMAP.md` (v1.0 archived in MILESTONES.md)

</details>

<details>
<summary>✅ v1.1 — AI + Team + Dashboard (Phases 3–5) — SHIPPED 2026-04-24</summary>

- [x] Phase 3: AI Integration (13/13 plans) — completed 2026-04-22
- [x] Phase 4: Team Management (8/8 plans) — completed 2026-04-23
- [x] Phase 5: Dashboard + Onboarding (5/5 plans) — completed 2026-04-24

See full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### v1.2 — Real-time + Polish

- [x] **Phase 6: Real-time Infrastructure** — Live Kanban status updates and live comments via Reverb WebSocket
- [ ] **Phase 7: Mobile + PWA** — Responsive layout fix, mobile-first UI redesign, PWA manifest + service worker
- [ ] **Phase 8: Multi-Org + Polish** — New org creation from /settings, SSE consolidation, TypeScript fixes, AI conversation picker

---

## Phase Details

### Phase 6: Real-time Infrastructure
**Goal:** Team members see live updates to Kanban card statuses and demand comments without refreshing the page.
**Depends on:** Phase 5 (v1.1 shipped)
**Requirements:** RT-01, RT-02
**Success Criteria** (what must be TRUE):
  1. When User A changes a demand status, User B's Kanban board reflects the new column position within seconds — no page refresh required.
  2. When User A posts a comment on a demand, User B who has the same demand modal open sees the comment appear live in the thread.
  3. Both events flow through the Reverb `private-organization.{org_id}` channel; no polling or manual reload is needed for either update.
  4. Existing drag-and-drop and optimistic update behavior on the Kanban board is unaffected by the broadcast layer.
**Plans:** 3 plans

Plans:
- [x] 06-01-PLAN.md — Evento DemandCommentCreated (backend RT-02) + stubs de teste Wave 0
- [x] 06-02-PLAN.md — Debounce na subscription RT-01 em Index.tsx
- [x] 06-03-PLAN.md — Subscription RT-02 em DemandDetailModal (frontend)

### Phase 7: Mobile + PWA
**Goal:** The Briefy app works beautifully on mobile browsers and can be installed as a PWA on iOS and Android.
**Depends on:** Phase 6
**Requirements:** MOB-01, MOB-02, MOB-03, MOB-04
**Success Criteria** (what must be TRUE):
  1. No horizontal scroll bar appears on any page when viewed on a 375px-wide mobile viewport.
  2. The Kanban board, demand modal, and dashboard are usable and visually polished on mobile.
  3. The app can be added to the home screen on iOS Safari and Android Chrome with a proper icon and splash screen.
  4. Core pages load and are navigable when the device is offline or on a slow connection (service worker caches shell).
**Plans:** 3 plans
**UI hint:** yes

Plans:
- [ ] 07-01-PLAN.md — AppLayout overflow-x-hidden + KanbanBoard scroll isolation + manifest.json icon split
- [ ] 07-02-PLAN.md — DemandDetailModal full-screen mobile + slide animation + swipe-to-close
- [ ] 07-03-PLAN.md — Verify app.blade.php PWA tags + Dashboard responsive grids + human UAT checkpoint

### Phase 8: Multi-Org + Polish
**Goal:** Existing users can create additional organizations from /settings, and the known technical debt from v1.1 is fully resolved.
**Depends on:** Phase 7
**Requirements:** MORG-01, POLISH-01, POLISH-02, POLISH-03
**Success Criteria** (what must be TRUE):
  1. A logged-in user can create a new organization directly from /settings without logging out or re-registering; the new org appears immediately in the OrgSwitcher.
  2. All AI streaming uses a single unified React hook — the parallel `useAiStream` / native `EventSource` pattern no longer exists in the codebase.
  3. TypeScript strict mode reports zero errors related to `auth.organization` shape mismatches and `AiIcon` size enum gaps.
  4. In the demand AI chat panel, a user can open a dropdown to select a previous AI conversation for that demand and resume it.
**Plans:** TBD

---

## Coverage

| REQ-ID    | Phase | Status  |
|-----------|-------|---------|
| RT-01     | 6     | Complete |
| RT-02     | 6     | Complete |
| MOB-01    | 7     | Pending |
| MOB-02    | 7     | Pending |
| MOB-03    | 7     | Pending |
| MOB-04    | 7     | Pending |
| MORG-01   | 8     | Pending |
| POLISH-01 | 8     | Pending |
| POLISH-02 | 8     | Pending |
| POLISH-03 | 8     | Pending |

**Total:** 10/10 requirements mapped. No orphans.
*(RT-03–RT-07 movidos para seed — Notifications System depriorizado em 2026-04-24)*

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Auth + Org + Layout | v1.0 | — | Complete | 2026-04-22 |
| 2. Clients + Demands | v1.0 | — | Complete | 2026-04-22 |
| 3. AI Integration | v1.1 | 13/13 | Complete | 2026-04-24 |
| 4. Team Management | v1.1 | 8/8 | Complete | 2026-04-24 |
| 5. Dashboard + Onboarding | v1.1 | 5/5 | Complete | 2026-04-24 |
| 6. Real-time Infrastructure | v1.2 | 3/3 | Complete | 2026-04-24 |
| 7. Mobile + PWA | v1.2 | 0/3 | Not started | - |
| 8. Multi-Org + Polish | v1.2 | 0/? | Not started | - |

---

## Backlog

### Phase 999.1: Dashboard async status cards (BACKLOG)

**Goal:** Show in-progress async operations as status cards on the admin dashboard — progress bar, completion/error state, click-to-navigate, auto-hide after viewed. Only visible to admin/owner. Real-time updates via Reverb (Phase 6 infrastructure).
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

**Notes:**
- Backend: DashboardController returns active ClientResearchSession + MonthlyPlan jobs scoped to org
- Frontend: 2 new cards in admin overview — progress bar via polling (router.reload) or Reverb broadcast
- Notification: fire existing notification event on job completion/failure
- Cards disappear from dashboard after clicked or via preferences flag
- Only admin/owner sees these cards (same isAdminOrOwner() gate)

---

*Roadmap created: 2026-04-22*
*Last updated: 2026-04-24 — Phase 7 substituída: Notifications → Mobile + PWA*
*Phase 7 planned: 2026-04-24 — 3 plans created*
