# Roadmap: Briefy

**Project:** Briefy — B2B SaaS for marketing agencies
**Core Value:** Agency teams can create, track, and complete client demands efficiently, with AI accelerating brief creation.

---

## Milestones

- ✅ **v1.0 — Core Platform** — Phases 1–2 (shipped 2026-04-22)
- ✅ **v1.1 — AI + Team + Dashboard** — Phases 3–5 (shipped 2026-04-24)
- ✅ **v1.2 — Real-time + Polish** — Phases 6–8 (shipped 2026-04-24)
  - Phase 7 substituída: Notifications → Mobile + PWA (prioridade ajustada em 2026-04-24)
- **v1.3 — Notifications + Test Coverage** — Phases 9–10 (in progress)

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
- [x] **Phase 7: Mobile + PWA** — Responsive layout fix, mobile-first UI redesign, PWA manifest + service worker — completed 2026-04-24
- [ ] **Phase 8: Multi-Org + Polish** — New org creation from OrgSwitcher, SSE consolidation, TypeScript fixes, AI conversation picker

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
- [x] 07-01-PLAN.md — AppLayout overflow-x-hidden + KanbanBoard scroll isolation + manifest.json icon split
- [x] 07-02-PLAN.md — DemandDetailModal full-screen mobile + slide animation + swipe-to-close
- [x] 07-03-PLAN.md — Verify app.blade.php PWA tags + Dashboard responsive grids + human UAT checkpoint

### Phase 8: Multi-Org + Polish
**Goal:** Existing users can create additional organizations from the OrgSwitcher, and the known technical debt from v1.1 is fully resolved.
**Depends on:** Phase 7
**Requirements:** MORG-01, POLISH-01, POLISH-02, POLISH-03
**Success Criteria** (what must be TRUE):
  1. A logged-in user can create a new organization directly from the OrgSwitcher dropdown without logging out or re-registering; the new org appears immediately in the switcher.
  2. All AI streaming uses a single unified React hook — the parallel `useAiStream` / native `EventSource` pattern no longer exists in the codebase.
  3. TypeScript strict mode reports zero errors related to `auth.organization` shape mismatches and `AiIcon` size enum gaps.
  4. In the demand AI chat panel, a user can open a dropdown to select a previous AI conversation for that demand and resume it.
**Plans:** 7 plans

Plans:
- [x] 08-01-PLAN.md — Wave 1: RED test stub (OrganizationCreationTest) + expand index.d.ts global types
- [x] 08-02-PLAN.md — Wave 2: MORG-01 backend — OrganizationController@store + POST /organizations route
- [x] 08-03-PLAN.md — Wave 2: POLISH-02 — remove local PageProps + AiIcon enum + Inertia v3 fix + unsafe casts
- [x] 08-04-PLAN.md — Wave 3: MORG-01 frontend — wire OrgSwitcher button + CreateOrgModal in AppLayout
- [x] 08-05-PLAN.md — Wave 3: POLISH-01 — extend useAiStream GET branch + migrate ClientResearchTimelineModal
- [x] 08-06-PLAN.md — Wave 3: POLISH-03 — conversation picker dropdown in ChatTab
- [x] 08-07-PLAN.md — Wave 4: Full verification + human UAT checkpoint — approved 2026-04-24

---

### Phase 9: Notifications System
**Goal:** Users receive in-app notifications in real-time when demands are assigned or change status, and can manage them from the bell dropdown.
**Depends on:** Phase 8
**Requirements:** RT-03, RT-04, RT-05, RT-06, RT-07
**Success Criteria:**
  1. A user assigned to a demand sees a notification appear in the bell dropdown without refreshing the page.
  2. The bell badge count updates live via WebSocket when a new notification arrives.
  3. User can mark all notifications as read and the badge clears immediately.
  4. Notification shows demand title, event type, and timestamp.
  5. Clicking a notification navigates to the relevant demand.

Plans:
- [ ] 09-01-PLAN.md — Backend: BriefyNotification model, events (DemandAssigned, DemandStatusChanged), broadcast via Reverb
- [ ] 09-02-PLAN.md — Frontend: real-time bell badge via Echo + notification dropdown with mark-as-read

### Phase 10: Automated Test Coverage
**Goal:** A comprehensive feature test suite covers all critical user flows, giving confidence that core functionality works and regressions are caught automatically.
**Depends on:** Phase 9
**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria:**
  1. `php artisan test` runs a full suite with no failures in a properly configured environment.
  2. Auth flow (register, login, logout) is covered by at least 4 test cases.
  3. Demand lifecycle (create, status update, assign, archive) has passing tests.
  4. Organization creation and team management flows have passing tests.
  5. AI chat endpoint has at least one integration test verifying message persistence.

Plans:
- [ ] 10-01-PLAN.md — Auth + Organization tests (TEST-01, TEST-02)
- [ ] 10-02-PLAN.md — Demand lifecycle + AI chat tests (TEST-03, TEST-04)
- [ ] 10-03-PLAN.md — Notification system tests + full suite smoke run (TEST-05)

---

## Coverage

| REQ-ID  | Phase | Status   |
|---------|-------|----------|
| RT-01   | 6     | Complete |
| RT-02   | 6     | Complete |
| MOB-01  | 7     | Complete |
| MOB-02  | 7     | Complete |
| MOB-03  | 7     | Complete |
| MOB-04  | 7     | Complete |
| MORG-01 | 8     | Complete |
| POLISH-01 | 8   | Complete |
| POLISH-02 | 8   | Complete |
| POLISH-03 | 8   | Complete |
| RT-03   | 9     | Pending  |
| RT-04   | 9     | Pending  |
| RT-05   | 9     | Pending  |
| RT-06   | 9     | Pending  |
| RT-07   | 9     | Pending  |
| TEST-01 | 10    | Pending  |
| TEST-02 | 10    | Pending  |
| TEST-03 | 10    | Pending  |
| TEST-04 | 10    | Pending  |
| TEST-05 | 10    | Pending  |

**Total:** 20/20 requirements mapped. No orphans.

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Auth + Org + Layout | v1.0 | — | Complete | 2026-04-22 |
| 2. Clients + Demands | v1.0 | — | Complete | 2026-04-22 |
| 3. AI Integration | v1.1 | 13/13 | Complete | 2026-04-24 |
| 4. Team Management | v1.1 | 8/8 | Complete | 2026-04-23 |
| 5. Dashboard + Onboarding | v1.1 | 5/5 | Complete | 2026-04-24 |
| 6. Real-time Infrastructure | v1.2 | 3/3 | Complete | 2026-04-24 |
| 7. Mobile + PWA | v1.2 | 0/3 | Not started | - |
| 8. Multi-Org + Polish | v1.2 | 0/7 | Not started | - |

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
*Last updated: 2026-04-24 — Phase 8 planned: 7 plans created*
*Phase 7 planned: 2026-04-24 — 3 plans created*
