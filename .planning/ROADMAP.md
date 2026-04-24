# Roadmap: Briefy

**Project:** Briefy — B2B SaaS for marketing agencies
**Core Value:** Agency teams can create, track, and complete client demands efficiently, with AI accelerating brief creation.

---

## Milestones

- ✅ **v1.0 — Core Platform** — Phases 1–2 (shipped 2026-04-22)
- ✅ **v1.1 — AI + Team + Dashboard** — Phases 3–5 (shipped 2026-04-24)
- **v1.2 — Real-time + Polish** — Phases 6–8 (in progress)

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
- [ ] **Phase 7: Notifications System** — In-app notification delivery, bell badge, dropdown, and mark-read
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

### Phase 7: Notifications System
**Goal:** Users are alerted in-app when demands are assigned to them or change status, with a persistent notification center in the header.
**Depends on:** Phase 6
**Requirements:** RT-03, RT-04, RT-05, RT-06, RT-07
**Success Criteria** (what must be TRUE):
  1. User receives an in-app notification (via Reverb) within seconds of being assigned to a demand.
  2. User receives an in-app notification when a demand they own changes status.
  3. The bell icon in the header shows a numeric badge with the unread notification count; the count updates live without refresh.
  4. Clicking the bell opens a dropdown listing recent notifications, each showing a timestamp, demand name, and the triggering event.
  5. User can mark a single notification as read or mark all notifications as read at once; the unread badge updates immediately.
**Plans:** TBD
**UI hint:** yes

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
| RT-03     | 7     | Pending |
| RT-04     | 7     | Pending |
| RT-05     | 7     | Pending |
| RT-06     | 7     | Pending |
| RT-07     | 7     | Pending |
| MORG-01   | 8     | Pending |
| POLISH-01 | 8     | Pending |
| POLISH-02 | 8     | Pending |
| POLISH-03 | 8     | Pending |

**Total:** 11/11 requirements mapped. No orphans.

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
| 7. Notifications System | v1.2 | 0/? | Not started | - |
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
*Last updated: 2026-04-24 — Phase 6 complete (3/3 plans, RT-01 + RT-02 delivered)*
