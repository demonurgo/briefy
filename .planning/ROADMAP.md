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

<details>
<summary><strong>v1.1 — AI + Real-time + Dashboard (Phases 3–5)</strong></summary>

**Started:** 2026-04-22
**Goal:** Add AI assistant capabilities, live collaboration, and analytics dashboard.

### Phases

- [x] **Phase 3: AI Integration** — Brief generation, AI chat, streaming responses, client memory, monthly planning generation
- [ ] **Phase 4: Real-time Collaboration** — Live kanban updates, live comments, in-app notifications with unread bell
- [ ] **Phase 5: Dashboard + Onboarding** — Metrics charts, activity feed, workload views, guided first-use flow

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 3. AI Integration | 13/13 | Complete | 2026-04-22 |
| 4. Real-time Collaboration | 0/? | Not started | - |
| 5. Dashboard + Onboarding | 0/? | Not started | - |

</details>

---

## v1.1 — AI + Team + Dashboard (Phases 3–5)

**Started:** 2026-04-22
**Goal:** Add AI assistant capabilities, team management with roles/invites, and analytics dashboard.

### Phases

- [x] **Phase 3: AI Integration** — Brief generation, AI chat, streaming responses, client memory, monthly planning generation
- [x] **Phase 4: Team Management** — Invite members by email, roles (admin/member), team roster, user profiles with avatar
- [ ] **Phase 5: Dashboard + Onboarding** — Metrics charts, activity feed, workload views, guided first-use flow

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 3. AI Integration | 13/13 | Complete | 2026-04-22 |
| 4. Team Management | 8/8 | Complete | 2026-04-23 |
| 5. Dashboard + Onboarding | 0/5 | Not started | - |

---

## Phase Details

### Phase 3: AI Integration
**Goal:** Users can accelerate demand work with AI — generating structured briefs and chatting with a context-aware assistant that remembers client patterns.
**Depends on:** Phase 2 (demands and clients must exist as AI context)
**Requirements:** AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, MPLAN-01, MPLAN-02, MPLAN-03, MPLAN-04, MPLAN-05
**Status:** Complete — 2026-04-22
**Success Criteria** (what must be TRUE):
  1. User clicks "Generate Brief" on a demand and a structured brief appears in the demand detail, built from the demand's title, client, channel, objective, tone, and description fields
  2. User can click "Regenerate Brief" to produce a new version, replacing the previous one
  3. User opens the AI chat tab on a demand, types a question, and receives a response that references the demand's metadata, files list, and past comments — without the user having to re-explain context
  4. AI responses stream progressively character by character rather than appearing all at once after a delay
  5. AI incorporates client-specific memory (tone preferences, past patterns) on subsequent demands for the same client, and updates that memory after each interaction
**Plans:** 13 plans (12b deferred to v1.2)
Plans:
- [x] 03-01-PLAN.md - BYOK infrastructure (encrypted API key, AnthropicClientFactory, /settings/ai page, Inertia shared props)
- [x] 03-02-PLAN.md - Schema migrations (monthly_plan, client_research_sessions, compacted_at) + BLOCKING migrate
- [x] 03-03-PLAN.md - AGPL-3.0 license + per-file headers script + README BYOK + npm deps
- [x] 03-04-PLAN.md - Brief streaming (AiBriefController + BriefStreamer + inline edit)
- [x] 03-05-PLAN.md - Chat streaming (AiChatController + ChatStreamer + conversation lifecycle)
- [x] 03-06-PLAN.md - Monthly plan generation (Opus 4.7 + tool-use + 7-action controller)
- [x] 03-07-PLAN.md - Memory extraction + compaction jobs (Haiku 4.5 + PII + confidence gates)
- [x] 03-08-PLAN.md - Shared frontend (AiIcon, useAiStream, useTypewriter, AiMarkdown, i18n)
- [x] 03-09-PLAN.md - DemandDetailModal 4-tab refactor + BriefTab + ChatTab
- [x] 03-10-PLAN.md - ClientForm monthly plan section + Clients/Index badges
- [x] 03-11-PLAN.md - /planejamento page + Dashboard widget + Sidebar nav
- [x] 03-12-PLAN.md - Client Research Managed Agent (hackathon prize track)
- [x] 03-13-PLAN.md - AI Usage Meter + Observability (Redis + OTEL, optional)
**UI hint:** yes

---

### Phase 4: Team Management
**Goal:** Agency admins can invite team members, assign roles, manage the roster, and every user can maintain their own profile with avatar — making the platform truly multi-user for the whole agency.
**Depends on:** Phase 3 (organization and user models already exist)
**Requirements:** TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06
**Success Criteria** (what must be TRUE):
  1. Admin sends an invite by email; the invited person receives a link, clicks it, and lands in the organization as a member
  2. Admin can view all organization members in a team roster page showing name, avatar, role, and join date
  3. Admin can change a member's role (admin ↔ member) or remove them from the organization
  4. Any user can edit their own profile: display name, avatar photo upload, and locale/theme preferences
  5. Role-based access is enforced: only admins and owners can invite/remove members, manage clients, and delete others' content
  6. Settings page is organized into clear sections: Profile, Organization, Team, AI Key — replacing the current scattered layout
**Plans:** 8 plans
Plans:
- [x] 04-01-PLAN.md — Schema migrations (organization_user pivot + column rename + invitations + avatar + role enum) + intervention/image install
- [x] 04-02-PLAN.md — Model updates (User pivot API, Organization, Invitation) + all 39 controller reference updates + RegisteredUserController + HandleInertiaRequests
- [x] 04-03-PLAN.md — Wave 0 test scaffolds (7 test files in RED state)
- [x] 04-04-PLAN.md — Invitation backend (InvitationController + TeamController + SettingsController + ProfileController + routes)
- [x] 04-05-PLAN.md — EnsureRole middleware + collaborator restrictions in DemandController/ClientController
- [x] 04-06-PLAN.md — Invite/Accept.tsx (guest invitation acceptance page)
- [x] 04-07-PLAN.md — UserAvatar component + OrgSwitcher in AppLayout header
- [x] 04-08-PLAN.md — Settings/Index.tsx unified page (4 sections + sticky sub-nav + scroll-spy)
**UI hint:** yes

---

### Phase 5: Dashboard + Onboarding
**Goal:** Admins have clear visibility into team workload and client activity through charts and an activity feed; new users are guided to their first productive action.
**Depends on:** Phase 4 (team/role data needed for workload charts per member)
**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, ONBRD-01, ONBRD-02
**Success Criteria** (what must be TRUE):
  1. Admin navigates to the dashboard and sees a chart breaking down all demands by status (e.g., backlog, in progress, review, done)
  2. Admin sees demand distribution per team member (workload) and per client (activity overview) on the same dashboard
  3. Any user sees a personal summary card showing their own assigned demands counted by status
  4. Dashboard displays a recent activity feed showing the last 10–15 demand actions (status changes, comments, assignments) across the organization
  5. A first-time user with no clients or demands sees an onboarding checklist guiding them through: add a client, create a first demand — and can dismiss or mark it complete at any step
**Plans:** 5 plans
Plans:
- [ ] 05-00-PLAN.md — Wave 0: migrations (activity_logs + priority) + migrate + recharts install + test scaffolds RED
- [ ] 05-01-PLAN.md — DashboardController completo + ActivityLog model + preferences route fix (BLOCKER-02)
- [ ] 05-02-PLAN.md — DemandObserver + ClientObserver + AppServiceProvider (activity logging)
- [ ] 05-03-PLAN.md — Componentes React: DashboardStatusCard, DashboardSectionCard, ActivityFeed, OnboardingChecklist
- [ ] 05-04-PLAN.md — Dashboard.tsx completo (view pessoal + view gerencial + charts Recharts)
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
| TEAM-01 | Phase 4 | Team Management |
| TEAM-02 | Phase 4 | Team Management |
| TEAM-03 | Phase 4 | Team Management |
| TEAM-04 | Phase 4 | Team Management |
| TEAM-05 | Phase 4 | Team Management |
| TEAM-06 | Phase 4 | Team Management |
| DASH-01 | Phase 5 | Dashboard |
| DASH-02 | Phase 5 | Dashboard |
| DASH-03 | Phase 5 | Dashboard |
| DASH-04 | Phase 5 | Dashboard |
| DASH-05 | Phase 5 | Dashboard |
| ONBRD-01 | Phase 5 | Onboarding |
| ONBRD-02 | Phase 5 | Onboarding |

**v1.1 coverage: 25/25 requirements mapped. No orphans.**

> **Deferred to v1.2:** RT-01–RT-05 (Real-time Collaboration via Laravel Reverb) — infrastructure exists, deferred in favor of team management.

---
*Roadmap created: 2026-04-22*
*Last updated: 2026-04-23 — Phase 5 planned with 5 plans (Wave 0 + 4 feature plans in 2 waves)*
