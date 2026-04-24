# Roadmap: Briefy

**Project:** Briefy — B2B SaaS for marketing agencies
**Core Value:** Agency teams can create, track, and complete client demands efficiently, with AI accelerating brief creation.

---

## Milestones

- ✅ **v1.0 — Core Platform** — Phases 1–2 (shipped 2026-04-22)
- ✅ **v1.1 — AI + Team + Dashboard** — Phases 3–5 (shipped 2026-04-24)
- 📋 **v1.2 — Real-time + Polish** — Phases 6+ (planned)

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

### 📋 v1.2 — Real-time + Polish (Planned)

- [ ] Phase 6: Real-time Collaboration — Live Kanban updates, live comments, in-app notifications (RT-01–RT-05)
- [ ] Phase 7: Polish + Multi-org — Multi-org creation UI, TypeScript strict cleanup, SSE consolidation

---

## Backlog

### Phase 999.1: Dashboard async status cards (deep research + monthly planning) (BACKLOG)

**Goal:** Show in-progress async operations as status cards on the admin dashboard — progress bar, completion/error state, click-to-navigate, auto-hide after viewed. Only visible to admin/owner. Real-time updates via Reverb (Phase 4 infrastructure).
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
*Last updated: 2026-04-24 — v1.1 archived, v1.2 planned*
