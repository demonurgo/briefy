# Briefy

## What This Is

Briefy is a B2B SaaS platform for marketing agencies and freelancers to manage client demands using integrated artificial intelligence. Agencies create organizations, invite team members, manage clients, and track creative demands through a Kanban-style workflow — with AI acting as an assistant, not a replacement.

## Core Value

Agency teams can create, track, and complete client demands efficiently, with AI accelerating brief creation and reducing manual context-switching.

## Requirements

### Validated

- ✓ User can register, create organization, and invite team — Phase 1
- ✓ User can set locale and theme preferences — Phase 1
- ✓ User can manage clients (CRUD with avatar) — Phase 2
- ✓ User can create demands linked to clients with all metadata fields — Phase 2
- ✓ User can view demands as Kanban board with drag-and-drop — Phase 2
- ✓ User can view demands as list with filters — Phase 2
- ✓ User can open demand detail modal without leaving the board — Phase 2
- ✓ User can change demand status inline (board card + modal) — Phase 2
- ✓ User can add/rename/download/delete files on demands — Phase 2
- ✓ User can add/edit/delete comments on demands — Phase 2
- ✓ Admin can delete files and comments from other users — Phase 2
- ✓ User can generate an AI brief from demand metadata — Phase 3
- ✓ User can chat with AI assistant about a specific demand — Phase 3
- ✓ AI remembers client context across demands — Phase 3
- ✓ Admin can invite team members by email with role assignment — Phase 4
- ✓ Admin can manage team roster (view, change roles, remove members) — Phase 4
- ✓ Any user can maintain their own profile with avatar upload — Phase 4
- ✓ Role-based access enforced: only admins/owners can invite, remove, and manage clients — Phase 4
- ✓ Unified settings page (/settings) with Profile, Organization, Team, AI sections — Phase 4

### Active

<!-- Milestone v1.1: AI Integration + Team + Dashboard -->

- [ ] Admin sees dashboard with demand metrics and team activity — Phase 5
- [ ] New users are guided through onboarding on first login — Phase 5

### Out of Scope

- Mobile native app — web-first, PWA covers mobile
- Video generation / multimedia AI — text-only AI in v1.1
- Billing / subscription management — no payment system yet
- Client portal (client-facing login) — agency-only access for now

## Context

**Stack:** PHP 8.4, Laravel 13, Inertia.js v3, React 19, TypeScript, Tailwind CSS, PostgreSQL 17
**AI:** Anthropic PHP SDK (`anthropics/anthropic-sdk-php`) — acesso direto à API Claude
**Real-time:** Laravel Reverb (WebSockets)
**Design tokens:** primary #7c3aed, dark bg #0b0f14, surface #111827, border #1f2937
**i18n:** pt-BR (default), en, es via i18next + Laravel lang files
**Drag-and-drop:** @dnd-kit/core + @dnd-kit/utilities

Database has `ai_memory` table (organization-scoped, key/value context store).

## Constraints

- **Stack:** PHP 8.4 + Laravel 13 — no framework changes
- **AI provider:** Prism PHP abstraction — provider-agnostic, start with OpenAI/Anthropic
- **Real-time:** Laravel Reverb only — no Pusher/Soketi
- **UI:** All new UI must follow design tokens from docs/design-brief.md

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Inertia partial reloads (`only: [...]`) for modal actions | Avoids full page reload; keeps kanban state | ✓ Good |
| Inline status change via PATCH (no redirect) | UX: change status without leaving board | ✓ Good |
| `useEffect` sync for KanbanBoard local state | Prop changes from Inertia don't auto-update useState | ✓ Good |
| Separate `demands.inline.update` route for modal edits | Allows `back()` response instead of redirect | ✓ Good |
| Deadline stored as full datetime, trimmed to `substring(0,10)` for date inputs | Laravel stores datetime; HTML date input needs YYYY-MM-DD | ✓ Good |

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
*Last updated: 2026-04-22 after Phase 2 complete (Clients + Demands core)*
