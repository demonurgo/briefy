# Retrospective: Briefy

---

## Milestone: v1.1 — AI + Team + Dashboard

**Shipped:** 2026-04-24
**Phases:** 3 | **Plans:** 26 | **Timeline:** 3 days (2026-04-22 → 2026-04-24)

### What Was Built

- BYOK per-org Anthropic key with encrypted cast, health checks, /settings/ai page
- Brief generation and AI chat via SSE streaming (character-by-character, useAiStream + useTypewriter)
- AI client memory extraction with 4-gate PII-scrubbing pipeline (Haiku 4.5, confidence ≥ 0.6)
- Monthly content planning via tool-use (Opus 4.7) with convert/redesign/reject actions on /planejamento
- Client Research Managed Agent (MA beta) — async web research with SSE progress streaming
- Multi-org invite system: email invitations, role assignment (admin/member/collaborator), acceptance flow
- EnsureRole middleware enforcing RBAC across all controllers
- UserAvatar with deterministic HSL gradient fallback + OrgSwitcher in AppLayout header
- Unified /settings page (Profile, Organization, Team, AI Key — 4 sections, scroll-spy)
- Dashboard with Recharts charts (PieChart/BarChart/LineChart) — personal + admin overview views
- Activity feed (last 15 events via DemandObserver + ClientObserver)
- OnboardingChecklist for new orgs with preferences-based dismiss persistence

### What Worked

- **BYOK pattern first (Plan 01):** Establishing AnthropicClientInterface + Factory early meant all 12 downstream AI plans had a clean testable contract — zero rework on the abstraction
- **Wave-based parallelization:** Plans 04/05/06/07 ran in parallel (Wave 1 of Phase 3) after Wave 0 migrations — consistently cut wall-clock time vs. sequential execution
- **Organization_user pivot decision (Phase 4):** Replacing `users.organization_id` scalar with a proper pivot table required touching 39 controller references but unlocked clean multi-org support with minimal future friction
- **recharts over react-chartjs-2:** Tree-shakable, better TypeScript types, no canvas dependency — the right pick for an SSR-adjacent Inertia app

### What Was Inefficient

- **intervention/image missing from vendor:** Package was in `composer.json` but never installed — only caught during UAT (Phase 4 Teste 3). Should be caught by a `composer install` check in the execute workflow
- **VERIFICATION.md stale gap:** DashboardPlanningWidget.tsx was reported missing in Phase 03 verification, but the file was created after the verification ran. The verify agent ran too early in the wave sequence
- **REQUIREMENTS.md never updated during execution:** All 25 requirements stayed `Pending` throughout v1.1 execution — traceability was tracked only in VERIFICATION.md. Minor friction for milestone close

### Patterns Established

- `AnthropicClientInterface` + `AnthropicClientFactory::forOrganization()` — use for every new AI service
- `bootstrap/app.php dontFlash()` for sensitive fields (Laravel 11+ — no Handler.php)
- `organization_user` pivot with `role` enum — pattern for any future multi-entity membership
- `preferences` JSON column for user-scoped boolean flags (dismissals, settings) — avoids new tables for lightweight state
- `ActivityLog timestamps=false + nullable user_id` — lean event log pattern safe on user delete
- Wave 0 = schema + RED tests before any feature code — established across Phase 3, 4, 5

### Key Lessons

1. **Run `composer install` as first step of any new dev environment** — lockfile can diverge from vendor silently
2. **Verify agent should run after the final wave completes**, not after Wave 0 — gaps from missing files show up as false positives when verification precedes execution
3. **Pre-milestone UAT is the right forcing function** — caught the avatar bug before tagging; worth the overhead
4. **Deferred items compound fast** — RT-01–RT-05 were deferred from v1.1 Phase 4 into v1.2; they now co-exist with TypeScript strict errors and SSE consolidation as carry-forward debt. v1.2 needs a dedicated "cleanup" phase

### Cost Observations

- Model mix: heavy Sonnet 4.6 usage across all phases (plan, execute, verify)
- Sessions: ~8 sessions across 3 days
- Notable: Phase 3 was the most expensive phase (13 plans, AI API integration, OTEL) — budget ~2x a typical feature phase

---

## Cross-Milestone Trends

### Velocity

| Milestone | Phases | Plans | Days | Plans/Day |
|-----------|--------|-------|------|-----------|
| v1.0 | 2 | ~10 | ~2 | ~5 |
| v1.1 | 3 | 26 | 3 | ~8.7 |

### Carry-Forward Debt

| Item | Since | v1.2 Priority |
|------|-------|--------------|
| RT-01–RT-05 (Real-time) | v1.1 plan | High — was original v1.1 scope |
| TypeScript strict errors | v1.1 execute | Medium — non-blocking but accumulating |
| SSE dual-pattern | v1.1 Phase 3 | Medium — DX friction |
| Multi-org creation UI | v1.1 UAT | Low — usability gap, not blocker |
