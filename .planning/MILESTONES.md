# Milestones: Briefy

## ✅ v1.0 — Core Platform (Phases 1–2)

**Shipped:** 2026-04-22
**Goal:** Build the foundational agency workflow — auth, organizations, clients, and demands with Kanban.

**What shipped:**
- Multi-tenant auth with organization creation on register
- Collapsible sidebar (desktop), BottomNav (mobile), dark mode, i18n (pt-BR/en/es)
- Client CRUD with avatar
- Demand CRUD (Create, Edit, Show) linked to clients
- Kanban board with drag-and-drop (@dnd-kit), optimistic updates
- List view with filters (client, status, search)
- Demand detail modal (inline edit, status picker, files, comments)
- Admin permissions (delete any file/comment)
- Loading states, empty states, flash messages

**Phases:**
- Phase 1: Auth + Org + Layout
- Phase 2: Clients + Demands

---

## ✅ v1.1 — AI + Team + Dashboard (Phases 3–5)

**Shipped:** 2026-04-24
**Started:** 2026-04-22
**Timeline:** 3 days
**Phases:** 3 | **Plans:** 26 | **Commits:** ~225

**Goal:** Add AI assistant capabilities, team management with roles/invites, and analytics dashboard.

**What shipped:**
- BYOK per-org Anthropic API key with encrypted cast, health checks, /settings/ai page
- AI brief generation and chat with SSE streaming (character-by-character)
- AI client memory extraction with 4-gate PII-scrubbing pipeline (Haiku 4.5)
- Monthly content planning via tool-use (Opus 4.7) with convert/redesign/reject actions
- Client Research Managed Agent (MA beta) — researches clients via web
- AI usage telemetry (Redis counters + optional OTEL tracing)
- Multi-org invite system: email invitations, role assignment, acceptance flow
- EnsureRole middleware with admin/member/collaborator gates
- UserAvatar with deterministic HSL gradient fallback + OrgSwitcher in header
- Unified /settings page: Profile, Organization, Team, AI sections
- Dashboard with PieChart/BarChart/LineChart (Recharts) — personal + overview views
- Activity feed (last 15 events via DemandObserver + ClientObserver)
- OnboardingChecklist for new users with preferences-based dismiss persistence

**Phases:**
- Phase 3: AI Integration (13 plans)
- Phase 4: Team Management (8 plans)
- Phase 5: Dashboard + Onboarding (5 plans)

**Archive:** `.planning/milestones/v1.1-ROADMAP.md`
