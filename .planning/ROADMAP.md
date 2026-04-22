# Roadmap: Briefy

**Project:** Briefy — B2B SaaS for marketing agencies
**Core Value:** Agency teams can create, track, and complete client demands efficiently, with AI accelerating brief creation.

---

## Milestones

<details>
<summary><strong>v1.0 — Core Platform (Phases 1–2) — Shipped 2026-04-22</strong></summary>

**Goal:** Build the foundational agency workflow — auth, organizations, clients, and demands with Kanban.

### Phases

- [x] **Phase 1: Auth + Org + Layout** — Multi-tenant auth, organization creation, sidebar, i18n, dark mode
- [x] **Phase 2: Clients + Demands** — Client CRUD, demand CRUD, Kanban board, list view, detail modal, files, comments

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth + Org + Layout | — | Complete | 2026-04-22 |
| 2. Clients + Demands | — | Complete | 2026-04-22 |

</details>

---

## v1.1 — AI + Real-time + Dashboard (Phases 3–5)

**Started:** 2026-04-22
**Goal:** Add AI assistant capabilities, live collaboration, and analytics dashboard.

### Phases

- [ ] **Phase 3: AI Integration** — Brief generation, AI chat, streaming responses, client memory, monthly planning generation
- [ ] **Phase 4: Real-time Collaboration** — Live kanban updates, live comments, in-app notifications with unread bell
- [ ] **Phase 5: Dashboard + Onboarding** — Metrics charts, activity feed, workload views, guided first-use flow

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 3. AI Integration | 0/? | Not started | - |
| 4. Real-time Collaboration | 0/? | Not started | - |
| 5. Dashboard + Onboarding | 0/? | Not started | - |

---

## Phase Details

### Phase 3: AI Integration
**Goal:** Users can accelerate demand work with AI — generating structured briefs and chatting with a context-aware assistant that remembers client patterns.
**Depends on:** Phase 2 (demands and clients must exist as AI context)
**Requirements:** AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, MPLAN-01, MPLAN-02, MPLAN-03, MPLAN-04, MPLAN-05
**Success Criteria** (what must be TRUE):
  1. User clicks "Generate Brief" on a demand and a structured brief appears in the demand detail, built from the demand's title, client, channel, objective, tone, and description fields
  2. User can click "Regenerate Brief" to produce a new version, replacing the previous one
  3. User opens the AI chat tab on a demand, types a question, and receives a response that references the demand's metadata, files list, and past comments — without the user having to re-explain context
  4. AI responses stream progressively character by character rather than appearing all at once after a delay
  5. AI incorporates client-specific memory (tone preferences, past patterns) on subsequent demands for the same client, and updates that memory after each interaction
**Plans:** TBD
**UI hint:** yes

---

### Phase 4: Real-time Collaboration
**Goal:** Team members see demand changes live and receive in-app notifications for actions that affect them — no manual refresh required.
**Depends on:** Phase 3 (Reverb infrastructure can be set up in parallel, but Phase 3 must ship first per milestone sequence)
**Requirements:** RT-01, RT-02, RT-03, RT-04, RT-05
**Success Criteria** (what must be TRUE):
  1. When a team member moves a demand card to a different Kanban column, every other logged-in user sees the card move to the new column without refreshing
  2. When a user adds a comment to a demand, it appears live in any open demand detail modal for other team members viewing the same demand
  3. When a demand is assigned to a user, that user receives an in-app notification immediately
  4. When a demand's status changes, the owner and assignee receive an in-app notification reflecting the new status
  5. The header bell icon shows an unread notification count badge; clicking it opens a dropdown listing recent notifications, and reading them clears the badge
**Plans:** TBD
**UI hint:** yes

---

### Phase 5: Dashboard + Onboarding
**Goal:** Admins have clear visibility into team workload and client activity through charts and an activity feed; new users are guided to their first productive action.
**Depends on:** Phase 4
**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, ONBRD-01, ONBRD-02
**Success Criteria** (what must be TRUE):
  1. Admin navigates to the dashboard and sees a chart breaking down all demands by status (e.g., backlog, in progress, review, done)
  2. Admin sees demand distribution per team member (workload) and per client (activity overview) on the same dashboard
  3. Any user sees a personal summary card showing their own assigned demands counted by status
  4. Dashboard displays a recent activity feed showing the last 10–15 demand actions (status changes, comments, assignments) across the organization
  5. A first-time user with no clients or demands sees an onboarding checklist guiding them through: add a client, create a first demand — and can dismiss or mark it complete at any step
**Plans:** TBD
**UI hint:** yes

---

## Coverage Map

| Requirement | Phase | Category |
|-------------|-------|----------|
| AI-01 | Phase 3 | AI Assistant |
| AI-02 | Phase 3 | AI Assistant |
| AI-03 | Phase 3 | AI Assistant |
| AI-04 | Phase 3 | AI Assistant |
| AI-05 | Phase 3 | AI Assistant |
| AI-06 | Phase 3 | AI Assistant |
| AI-07 | Phase 3 | AI Assistant |
| MPLAN-01 | Phase 3 | Monthly Planning |
| MPLAN-02 | Phase 3 | Monthly Planning |
| MPLAN-03 | Phase 3 | Monthly Planning |
| MPLAN-04 | Phase 3 | Monthly Planning |
| MPLAN-05 | Phase 3 | Monthly Planning |
| RT-01 | Phase 4 | Real-time |
| RT-02 | Phase 4 | Real-time |
| RT-03 | Phase 4 | Real-time |
| RT-04 | Phase 4 | Real-time |
| RT-05 | Phase 4 | Real-time |
| DASH-01 | Phase 5 | Dashboard |
| DASH-02 | Phase 5 | Dashboard |
| DASH-03 | Phase 5 | Dashboard |
| DASH-04 | Phase 5 | Dashboard |
| DASH-05 | Phase 5 | Dashboard |
| ONBRD-01 | Phase 5 | Onboarding |
| ONBRD-02 | Phase 5 | Onboarding |

**v1.1 coverage: 24/24 requirements mapped. No orphans.**

---
*Roadmap created: 2026-04-22*
*Last updated: 2026-04-22 — v1.1 roadmap initialized (Phases 3–5)*
