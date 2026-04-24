# Requirements: Briefy v1.3 — Notifications + Test Coverage

**Milestone:** v1.3
**Goal:** Entregar o sistema completo de notificações em tempo real e uma suíte de testes automatizados que garanta estabilidade do produto para o hackathon e além.

---

## v1.3 Requirements

### Notifications (restaurado do seed notifications-system.md)

- [ ] **RT-03**: User receives in-app notification when a demand is assigned to them
- [ ] **RT-04**: User receives in-app notification when the status of a demand they own changes
- [ ] **RT-05**: Notification bell in the header shows an unread badge count that updates in real-time via WebSocket
- [ ] **RT-06**: User can open a dropdown from the bell icon and see recent notifications with timestamp and demand context
- [ ] **RT-07**: User can mark individual notifications or all notifications as read

### Test Coverage

- [ ] **TEST-01**: Feature tests cover the full authentication flow (register, login, logout, password reset)
- [ ] **TEST-02**: Feature tests cover organization management (create org, invite member, accept invite, change role, remove member)
- [ ] **TEST-03**: Feature tests cover demand lifecycle (create, update status, assign, archive, trash/restore)
- [ ] **TEST-04**: Feature tests cover AI chat endpoint (stream starts, message persisted, conversation created)
- [ ] **TEST-05**: Feature tests cover the notification delivery and read system (RT-03 to RT-07)

---

## Carried Forward (from v1.2 — Validated)

All v1.2 requirements delivered. See `.planning/milestones/v1.2-ROADMAP.md` (after archiving).

---

## Future Requirements (Deferred)

- Email notification digest — no email infra yet
- Notification preferences/settings per-user — defer to v2
- Live cursor / presence on Kanban — deferred to v2
- Browser/mobile push notifications (OS-level) — web in-app covers the need for v1.x
- AI: suggest status transitions from comments — deferred to v2
- AI: summarize comments into digest — deferred to v2

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| E2E browser tests (Playwright/Cypress) | Unit + feature tests sufficient for hackathon scope |
| Performance/load tests | Out of scope for v1.x |
| Multi-provider AI | Anthropic direct is the locked choice |
| Billing/subscriptions | No payment infra planned for v1.x |
| Client portal | Agency-only access for v1.x |

---

## Traceability

| REQ-ID  | Phase | Plan |
|---------|-------|------|
| RT-03   | 9     | —    |
| RT-04   | 9     | —    |
| RT-05   | 9     | —    |
| RT-06   | 9     | —    |
| RT-07   | 9     | —    |
| TEST-01 | 10    | —    |
| TEST-02 | 10    | —    |
| TEST-03 | 10    | —    |
| TEST-04 | 10    | —    |
| TEST-05 | 10    | —    |
