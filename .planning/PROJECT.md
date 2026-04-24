# Briefy

## What This Is

Briefy is a B2B SaaS platform for marketing agencies and freelancers to manage client demands using integrated artificial intelligence. Agencies create organizations, invite team members, manage clients, and track creative demands through a Kanban-style workflow — with AI acting as an assistant, not a replacement. Team members have role-based access (owner/admin/member/collaborator), and admins can monitor workload and activity via a dashboard with charts and activity feed.

## Core Value

Agency teams can create, track, and complete client demands efficiently, with AI accelerating brief creation and reducing manual context-switching.

## Requirements

### Validated

- ✓ User can register, create organization, and invite team — v1.0
- ✓ User can set locale and theme preferences — v1.0
- ✓ User can manage clients (CRUD with avatar) — v1.0
- ✓ User can create demands linked to clients with all metadata fields — v1.0
- ✓ User can view demands as Kanban board with drag-and-drop — v1.0
- ✓ User can view demands as list with filters — v1.0
- ✓ User can open demand detail modal without leaving the board — v1.0
- ✓ User can change demand status inline (board card + modal) — v1.0
- ✓ User can add/rename/download/delete files on demands — v1.0
- ✓ User can add/edit/delete comments on demands — v1.0
- ✓ Admin can delete files and comments from other users — v1.0
- ✓ User can generate an AI brief from demand metadata — v1.1
- ✓ User can chat with AI assistant about a specific demand — v1.1
- ✓ AI remembers client context across demands — v1.1
- ✓ User can generate a monthly content plan per client with AI — v1.1
- ✓ Admin can invite team members by email with role assignment — v1.1
- ✓ Admin can manage team roster (view, change roles, remove members) — v1.1
- ✓ Any user can maintain their own profile with avatar upload — v1.1
- ✓ Role-based access enforced: only admins/owners can invite, remove, and manage clients — v1.1
- ✓ Unified settings page (/settings) with Profile, Organization, Team, AI sections — v1.1
- ✓ Admin sees dashboard with demand metrics, charts, and team activity — v1.1
- ✓ New users are guided through onboarding on first login — v1.1

### Active

<!-- Milestone v1.2: Real-time + Polish -->

- [ ] Live Kanban updates when team member changes a demand status (RT-01)
- [ ] New comments appear live in demand detail (RT-02)
- [ ] In-app notifications for assignments and status changes (RT-03, RT-04)
- [ ] Notification bell with unread count and dropdown (RT-05)
- [ ] Multi-org creation UI in /settings for existing users

### Out of Scope

- Mobile native app — web-first, PWA covers mobile
- Video generation / multimedia AI — text-only AI in v1.x
- Billing / subscription management — no payment system yet
- Client portal (client-facing login) — agency-only access for now
- Multiple AI providers / model switcher — Anthropic direct is the choice

## Context

**Stack:** PHP 8.4, Laravel 13, Inertia.js v3, React 19, TypeScript, Tailwind CSS, PostgreSQL 17
**AI:** Anthropic PHP SDK (`anthropics/anthropic-sdk-php`) — direct API, BYOK per-org
**Real-time:** Laravel Reverb (WebSockets) — installed, used for Kanban updates
**Charts:** recharts ^3.8.1 (PieChart, BarChart, LineChart)
**Image:** intervention/image ^3 + intervention/image-laravel ^1 (avatar resize)
**Design tokens:** primary #7c3aed, dark bg #0b0f14, surface #111827, border #1f2937
**i18n:** pt-BR (default), en, es via i18next + Laravel lang files
**Drag-and-drop:** @dnd-kit/core + @dnd-kit/utilities

**Codebase:** ~17,330 LOC (PHP + TypeScript/TSX combined)

Key tables: `organizations`, `organization_user` (pivot), `users`, `invitations`, `clients`, `demands`, `ai_conversations`, `ai_conversation_messages`, `ai_memory`, `client_research_sessions`, `planning_suggestions`, `activity_logs`

## Constraints

- **Stack:** PHP 8.4 + Laravel 13 — no framework changes
- **AI provider:** Anthropic SDK direct — provider-agnostic abstraction deferred
- **Real-time:** Laravel Reverb only — no Pusher/Soketi
- **UI:** All new UI must follow design tokens from docs/design-brief.md

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Inertia partial reloads (`only: [...]`) for modal actions | Avoids full page reload; keeps kanban state | ✓ Good |
| Inline status change via PATCH (no redirect) | UX: change status without leaving board | ✓ Good |
| `useEffect` sync for KanbanBoard local state | Prop changes from Inertia don't auto-update useState | ✓ Good |
| Separate `demands.inline.update` route for modal edits | Allows `back()` response instead of redirect | ✓ Good |
| Deadline stored as full datetime, trimmed to `substring(0,10)` | Laravel stores datetime; HTML date input needs YYYY-MM-DD | ✓ Good |
| Anthropic PHP SDK direct (no Prism) | Simpler dependency; streaming control; BYOK easier | ✓ Good |
| AnthropicClientInterface + Factory for BYOK | Per-org key resolution; test doubles without subclassing final SDK | ✓ Good |
| SSE via Laravel streaming + EventSource/fetch | No WebSocket overhead for AI streams | ✓ Good |
| organization_user pivot (replaces scalar organization_id) | Multi-org membership; clean role management | ✓ Good |
| recharts over react-chartjs-2 | Tree-shakable; no canvas; better TypeScript types | ✓ Good |
| ActivityLog timestamps=false + nullable user_id | Lean schema; safe on user delete | ✓ Good |
| OnboardingChecklist dismiss via preferences JSON column | No separate table; already had preferences pattern | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-24 after v1.1 milestone — AI + Team + Dashboard fully shipped*
