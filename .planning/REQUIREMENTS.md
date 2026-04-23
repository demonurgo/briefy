# Requirements: Briefy

**Defined:** 2026-04-22
**Core Value:** Agency teams can create, track, and complete client demands efficiently, with AI accelerating brief creation.

## v1.1 Requirements

Requirements for milestone v1.1 (AI + Real-time + Dashboard). Continues from v1.0 validated.

### AI Assistant

- [ ] **AI-01**: User can request AI to generate a content brief for a demand (using title, client, channel, objective, tone as context)
- [ ] **AI-02**: AI-generated brief is displayed as a dedicated section in the demand detail modal and demand show page
- [ ] **AI-03**: User can regenerate the AI brief with a one-click action
- [x] **AI-04**: User can chat with an AI assistant within a demand, asking questions and receiving contextual responses
- [x] **AI-05**: AI chat has access to full demand context (metadata, files list, past comments) as system prompt
- [x] **AI-06**: AI stores and retrieves client-specific memory (preferences, tone, past patterns) per organization via the existing `ai_memory` table
- [x] **AI-07**: AI responses stream progressively (character by character) instead of appearing all at once

### Monthly Planning (AI)

- [ ] **MPLAN-01**: Client has a configurable monthly content plan with deliverable quantities (e.g., 20 posts/month, broken down by channel or content type)
- [ ] **MPLAN-02**: Client plan quantities are defined when creating a client and can be edited at any time (upgrade/downgrade)
- [ ] **MPLAN-03**: User can request AI to generate a monthly content planning for a client, and the AI respects the plan quantities exactly
- [ ] **MPLAN-04**: AI-generated monthly plan produces a structured list of content pieces (title suggestion, channel, content type, approximate week/date) that fills the full month quota
- [ ] **MPLAN-05**: Generated monthly plan can be viewed, and individual items can be converted into actual demands with one action

### Real-time Collaboration

- [ ] **RT-01**: Kanban board updates live (card moves column) when another team member changes a demand's status — no page refresh needed
- [ ] **RT-02**: New comments appear live in the demand detail modal when added by another user
- [ ] **RT-03**: User receives an in-app notification when they are assigned to a demand
- [ ] **RT-04**: User receives an in-app notification when a demand they own or are assigned to changes status
- [ ] **RT-05**: Notification bell in the header shows unread count; clicking opens a dropdown list of recent notifications

### Dashboard

- [ ] **DASH-01**: Admin/owner sees a dashboard with total demands broken down by status (visual chart)
- [ ] **DASH-02**: Admin sees demands per team member (workload distribution)
- [ ] **DASH-03**: Admin sees demands per client (client activity overview)
- [ ] **DASH-04**: Any user sees their own assigned demands summary (count by status)
- [ ] **DASH-05**: Dashboard shows a recent activity feed (last 10–15 demand actions across the organization)

### Onboarding

- [ ] **ONBRD-01**: First-time user (no clients, no demands yet) sees a guided checklist: create org → add client → create first demand
- [ ] **ONBRD-02**: User can dismiss or mark onboarding as complete at any step

## v2 Requirements

Deferred to future releases. Tracked but not in current roadmap.

### AI Enhancements

- **AI-F01**: AI can suggest demand status transitions based on comment activity
- **AI-F02**: AI can summarize all comments on a demand into a status digest
- **AI-F03**: Multi-turn AI conversation with persistent session history per demand

### Real-time Enhancements

- **RT-F01**: User sees live cursor/presence indicators on the kanban board (who is online)
- **RT-F02**: Demand is "locked" when another user is actively editing it

### Billing & Subscriptions

- **BILL-01**: Organization owner can subscribe to a paid plan
- **BILL-02**: AI usage is tracked and capped per plan tier

## Out of Scope

| Feature | Reason |
|---------|--------|
| Client portal (client-facing login) | Agency-only in v1.x; client access is a separate product surface |
| Mobile native app | Web-first + PWA covers mobile adequately for now |
| Video/image AI generation | Text-only AI in v1.1; multimedia adds significant cost and complexity |
| Multiple AI providers / model switcher | Anthropic SDK direct is the choice; abstraction deferred |
| Email notifications | In-app notifications first; email adds deliverability complexity |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-01 | Phase 3 | Pending |
| AI-02 | Phase 3 | Pending |
| AI-03 | Phase 3 | Pending |
| AI-04 | Phase 3 | Pending |
| AI-05 | Phase 3 | Pending |
| AI-06 | Phase 3 | Pending |
| AI-07 | Phase 3 | Pending |
| MPLAN-01 | Phase 3 | Pending |
| MPLAN-02 | Phase 3 | Pending |
| MPLAN-03 | Phase 3 | Pending |
| MPLAN-04 | Phase 3 | Pending |
| MPLAN-05 | Phase 3 | Pending |
| RT-01 | Phase 4 | Pending |
| RT-02 | Phase 4 | Pending |
| RT-03 | Phase 4 | Pending |
| RT-04 | Phase 4 | Pending |
| RT-05 | Phase 4 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |
| DASH-04 | Phase 5 | Pending |
| DASH-05 | Phase 5 | Pending |
| ONBRD-01 | Phase 5 | Pending |
| ONBRD-02 | Phase 5 | Pending |

**Coverage:**
- v1.1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 — traceability confirmed after roadmap creation*
