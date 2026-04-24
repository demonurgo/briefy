---
phase: 6
slug: real-time-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PHPUnit (Laravel) |
| **Config file** | `phpunit.xml` |
| **Quick run command** | `php artisan test --filter DemandComment` |
| **Full suite command** | `php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `php artisan test --filter DemandComment`
- **After every plan wave:** Run `php artisan test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-RT01-verify | TBD | 1 | RT-01 | — | Canal privado — apenas membros da org recebem | unit | `php artisan test --filter DemandBoardUpdated` | ❌ W0 | ⬜ pending |
| 6-RT02-event | TBD | 1 | RT-02 | — | Canal privado — apenas membros da org recebem broadcast | unit | `php artisan test --filter DemandCommentCreated` | ❌ W0 | ⬜ pending |
| 6-RT02-dispatch | TBD | 1 | RT-02 | — | Evento dispatched após comment criado, payload correto | feature | `php artisan test --filter DemandCommentCreated` | ❌ W0 | ⬜ pending |
| 6-RT02-frontend | TBD | 2 | RT-02 | — | N/A — frontend | manual | ver Manual-Only | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Unit/Events/DemandBoardUpdatedTest.php` — verifica RT-01: canal correto (`private-organization.{orgId}`), `broadcastAs()` retorna `'demand.board.updated'`, implementa `ShouldBroadcastNow`
- [ ] `tests/Feature/Broadcasting/DemandCommentCreatedTest.php` — verifica RT-02: evento é dispatched pelo `addComment()`, payload contém `organizationId`, `demandId`, `comment.{id, body, user, created_at}`, canal correto

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card Kanban muda de coluna em tempo real no browser do User B quando User A faz drag-and-drop | RT-01 | WebSocket end-to-end requer dois browsers reais | 1. Abrir dois browsers com users da mesma org. 2. User A arrasta card para nova coluna. 3. Verificar que User B vê o card na nova coluna sem refresh. 4. DevTools → Network → WS confirma evento `demand.board.updated` recebido. |
| Comentário novo aparece ao vivo no modal de User B quando User A posta | RT-02 | WebSocket end-to-end requer dois browsers reais | 1. Ambos os users abrem modal da mesma demand. 2. User A posta comentário. 3. User B vê o comentário aparecer no thread sem refresh. 4. DevTools → Network → WS confirma evento `demand.comment.created` recebido com payload correto. |
| Drag ativo não é interrompido quando broadcast chega | RT-01 | Requer interação de drag simultânea a broadcast | 1. User A começa a arrastar card (mantém mouse pressionado). 2. User B atualiza status de outra demand. 3. Verificar que o drag de User A não é resetado pelo reload. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
