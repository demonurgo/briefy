---
phase: 06-real-time-infrastructure
plan: "01"
subsystem: backend-broadcasting
tags: [laravel, reverb, broadcasting, events, tdd, rt-02]
dependency_graph:
  requires: []
  provides:
    - App\Events\DemandCommentCreated
    - DemandController::addComment() dispatch
  affects:
    - Wave 2 frontend subscription in DemandDetailModal.tsx
tech_stack:
  added: []
  patterns:
    - ShouldBroadcastNow (sync broadcast, no queue)
    - PrivateChannel("organization.{orgId}") — existing channel reused
    - TDD RED/GREEN cycle
key_files:
  created:
    - app/Events/DemandCommentCreated.php
    - tests/Unit/Events/DemandBoardUpdatedTest.php
    - tests/Feature/Broadcasting/DemandCommentCreatedTest.php
  modified:
    - app/Http/Controllers/DemandController.php
decisions:
  - "PrivateChannel->name armazena 'private-organization.{n}' (com prefixo) — ajustado nos asserts dos testes"
  - "ShouldBroadcastNow mantido (sync, sem fila) — consistente com DemandBoardUpdated"
  - "comment->load('user') antes do dispatch — create() não carrega relações automaticamente"
metrics:
  duration: "~15min"
  completed: "2026-04-24"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 6 Plan 01: DemandCommentCreated Backend Event Summary

Backend RT-02 completo: evento `DemandCommentCreated` com dispatch em `addComment()`, canal privado `organization.{orgId}`, payload `{id, body, user:{id,name}, created_at}`, 7 testes passando via TDD RED→GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar DemandCommentCreated.php e testes (TDD RED) | 6d7f822 | app/Events/DemandCommentCreated.php, tests/Unit/Events/DemandBoardUpdatedTest.php, tests/Feature/Broadcasting/DemandCommentCreatedTest.php |
| 2 | Dispatch em DemandController::addComment() (TDD GREEN) | b38b639 | app/Http/Controllers/DemandController.php |

## Test Results

```
Tests\Unit\Events\DemandBoardUpdatedTest        PASS (3 testes)
Tests\Feature\Broadcasting\DemandCommentCreatedTest  PASS (4 testes)

Total: 7 passed (10 assertions) — Duration: 2.51s
```

### Testes por categoria

**Unit (DemandBoardUpdatedTest):**
- `test_broadcast_on_returns_private_channel` — broadcastOn() retorna PrivateChannel com nome "private-organization.5"
- `test_broadcast_as_returns_correct_name` — broadcastAs() retorna 'demand.board.updated'
- `test_implements_should_broadcast_now` — instância de ShouldBroadcastNow

**Feature (DemandCommentCreatedTest):**
- `test_dispatch_after_add_comment` — POST /demands/{demand}/comments dispara DemandCommentCreated com payload correto
- `test_broadcast_channel_is_private_organization` — broadcastOn() retorna PrivateChannel("private-organization.42")
- `test_broadcast_as_returns_correct_event_name` — broadcastAs() retorna 'demand.comment.created'
- `test_implements_should_broadcast_now` — instância de ShouldBroadcastNow

## Estrutura do Evento DemandCommentCreated

```php
class DemandCommentCreated implements ShouldBroadcastNow
{
    public function __construct(
        public readonly int   $organizationId,
        public readonly int   $demandId,
        public readonly array $comment,  // {id, body, user:{id,name}, created_at: string ISO}
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("organization.{$this->organizationId}");
    }

    public function broadcastAs(): string
    {
        return 'demand.comment.created';
    }
}
```

## Modificação em DemandController::addComment()

O método agora:
1. Persiste o comentário via `DemandComment::create()`
2. Carrega `$comment->load('user')` (necessário — create() não eager-load relações)
3. Dispara `DemandCommentCreated::dispatch(organizationId, demandId, commentPayload)`
4. Payload inclui: `id`, `body`, `user.id`, `user.name`, `created_at` como string ISO 8601 via `->toJSON()`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Nome do canal PrivateChannel com prefixo 'private-'**
- **Found during:** Task 1 (RED phase)
- **Issue:** O plano indicava testar `$channel->name` contra `'organization.42'`, mas `PrivateChannel` armazena o nome com prefixo `private-` (ex: `'private-organization.42'`). Confirmado lendo o código-fonte de `PrivateChannel.php`
- **Fix:** Asserts dos testes ajustados para `'private-organization.{n}'`
- **Files modified:** tests/Unit/Events/DemandBoardUpdatedTest.php, tests/Feature/Broadcasting/DemandCommentCreatedTest.php
- **Commit:** 6d7f822

**2. [Rule 3 - Infra] Worktree sem vendor/ e psql não no PATH**
- **Found during:** Task 1 (execução dos testes)
- **Issue:** O worktree git não tem `vendor/` e o `psql` não estava no PATH (`C:\Program Files\PostgreSQL\17\bin`)
- **Fix:** Junction do `vendor/` do projeto principal via PowerShell `New-Item -ItemType Junction`; regeneração do autoload via `composer dump-autoload` no contexto do worktree; PATH exportado antes de cada `php artisan test`
- **Nota:** Falhas pré-existentes na suite completa (`organization_id` column missing em `briefy_test`) são schema drift pré-existente — confirmado no projeto principal também

## Known Stubs

Nenhum stub identificado. O evento retorna payload real com dados do banco.

## Threat Flags

Nenhum novo threat surface além do já documentado no threat model do plano:
- T-06-01: `authorizeDemand()` já valida pertencimento à org antes do dispatch
- T-06-02: canal `private-organization.{orgId}` já autenticado em `routes/channels.php`
- T-06-03: payload 100% construído no servidor — client não influencia o broadcast
- T-06-04: `/broadcasting/auth` endpoint cobre autorização WebSocket

## TDD Gate Compliance

- RED gate: commit `6d7f822` — `test(06-01): add failing tests for DemandCommentCreated event (TDD RED)`
- GREEN gate: commit `b38b639` — `feat(06-01): dispatch DemandCommentCreated in DemandController::addComment()`
- REFACTOR: não necessário — implementação limpa na primeira iteração

## Self-Check: PASSED

- `app/Events/DemandCommentCreated.php` — FOUND
- `tests/Unit/Events/DemandBoardUpdatedTest.php` — FOUND
- `tests/Feature/Broadcasting/DemandCommentCreatedTest.php` — FOUND
- `app/Http/Controllers/DemandController.php` (modificado) — FOUND
- Commit `6d7f822` — FOUND (git log)
- Commit `b38b639` — FOUND (git log)
