# Requirements: Briefy v1.2 — Real-time + Polish

**Milestone:** v1.2
**Goal:** Adicionar colaboração em tempo real via Laravel Reverb, experiência mobile + PWA, criação de multi-org para usuários existentes, e consolidar dívida técnica do v1.1.

---

## v1.2 Requirements

### Real-Time Collaboration

- [ ] **RT-01**: User sees Kanban card status update in real-time without page refresh when another team member changes it
- [ ] **RT-02**: User sees new comments appear live in the demand detail modal without refreshing when another team member adds one
~~RT-03 a RT-07 — Sistema de Notificações — movidos para seed (.planning/seeds/notifications-system.md) em 2026-04-24~~

### Mobile + PWA

- [ ] **MOB-01**: Nenhuma página exibe barra de scroll horizontal em viewport de 375px — layout 100% responsivo
- [ ] **MOB-02**: Kanban board, demand modal e dashboard são usáveis e visualmente polidos no mobile
- [ ] **MOB-03**: App pode ser instalado na tela inicial do iOS Safari e Android Chrome com ícone e splash screen corretos (PWA manifest)
- [ ] **MOB-04**: Core pages carregam e são navegáveis offline ou em conexão lenta (service worker caches shell)

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

| REQ-ID    | Phase | Plan |
|-----------|-------|------|
| RT-01     | 6     | —    |
| RT-02     | 6     | —    |
| MOB-01    | 7     | —    |
| MOB-02    | 7     | —    |
| MOB-03    | 7     | —    |
| MOB-04    | 7     | —    |
| MORG-01   | 8     | —    |
| POLISH-01 | 8     | —    |
| POLISH-02 | 8     | —    |
| POLISH-03 | 8     | —    |
