# Requirements: Briefy v1.2 — Real-time + Polish

**Milestone:** v1.2
**Goal:** Adicionar colaboração em tempo real via Laravel Reverb, sistema de notificações in-app, criação de multi-org para usuários existentes, e consolidar dívida técnica do v1.1.

---

## v1.2 Requirements

### Real-Time Collaboration

- [ ] **RT-01**: User sees Kanban card status update in real-time without page refresh when another team member changes it
- [ ] **RT-02**: User sees new comments appear live in the demand detail modal without refreshing when another team member adds one
- [ ] **RT-03**: User receives an in-app notification when a demand is assigned to them
- [ ] **RT-04**: User receives an in-app notification when a demand they own changes status
- [ ] **RT-05**: User sees an unread notification count badge on the bell icon in the header
- [ ] **RT-06**: User can open a notification dropdown listing recent notifications with timestamps and demand context
- [ ] **RT-07**: User can mark individual notifications as read or mark all notifications as read at once

### Multi-Org

- [ ] **MORG-01**: Existing user can create a new organization from /settings without re-registering

### Polish

- [ ] **POLISH-01**: SSE stream pattern consolidated — single hook covers both streaming chat and server-sent AI events (replaces dual useAiStream + EventSource pattern)
- [ ] **POLISH-02**: TypeScript strict errors resolved — auth.organization shape mismatch across components + AiIcon size enum gaps
- [ ] **POLISH-03**: User can pick from previous AI conversations via a dropdown in the demand AI chat panel

---

## Future Requirements (Deferred)

- Live cursor / presence on Kanban — deferred to v2 (complexity vs value)
- Demand locking during edit — deferred to v2
- AI: suggest status transitions from comments — deferred to v2
- AI: summarize comments into digest — deferred to v2
- Client portal (client-facing login) — out of scope for v1.x
- MA 03-12b backlog item — deferred, needs spec

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Push notifications (browser/mobile) | Web-first; in-app covers v1.2 needs |
| Email notification digest | No email infra yet |
| Notification preferences/settings | Defer to v1.3 when notification volume warrants it |
| Multi-provider AI | Anthropic direct is the locked choice for v1.x |
| Billing/subscriptions | No payment infra planned for v1.x |

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| RT-01 | — | — |
| RT-02 | — | — |
| RT-03 | — | — |
| RT-04 | — | — |
| RT-05 | — | — |
| RT-06 | — | — |
| RT-07 | — | — |
| MORG-01 | — | — |
| POLISH-01 | — | — |
| POLISH-02 | — | — |
| POLISH-03 | — | — |
