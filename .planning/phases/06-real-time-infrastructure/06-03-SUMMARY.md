---
phase: 06-real-time-infrastructure
plan: "03"
subsystem: ui
tags: [react, typescript, laravel-echo, reverb, websocket, real-time, broadcast]

dependency_graph:
  requires:
    - phase: 06-01
      provides: "DemandCommentCreated backend event dispatched in DemandController::addComment() on private-organization.{orgId} channel"
  provides:
    - "DemandDetailModal.tsx: useState<Comment[]> local state for comments"
    - "DemandDetailModal.tsx: Echo subscription for .demand.comment.created event"
    - "DemandDetailModal.tsx: stopListening cleanup preserving RT-01 channel"
  affects:
    - Wave 3 (Phases 7-8): notification UI can follow same Echo subscription pattern

tech-stack:
  added: []
  patterns:
    - "Echo channel.listen + channel.stopListening (never leave) for shared private channels"
    - "useState + useEffect sync pattern for prop-driven + broadcast-driven state"
    - "Guard D-06: deduplication via prev.some(c => c.id === event.id)"
    - "demandId filter guard inside broadcast listener to scope events to current modal"

key-files:
  created: []
  modified:
    - resources/js/Components/DemandDetailModal.tsx

key-decisions:
  - "channel.stopListening (not window.Echo.leave) on cleanup — canal compartilhado com RT-01 em Index.tsx"
  - "Array de deps [orgId, demand.id] garante re-subscription correta ao trocar de demanda"
  - "Guard demandId: evento da org pode pertencer a qualquer demanda — filtro é obrigatório"

patterns-established:
  - "Subscription Echo em modal: useEffect com [orgId, demand.id], stopListening no cleanup"
  - "Estado broadcast-driven: useState<T[]>(prop) + useEffect sync + append no listener"

requirements-completed:
  - RT-02

duration: ~10min
completed: 2026-04-24
---

# Phase 6 Plan 03: DemandDetailModal Echo RT-02 Subscription Summary

**DemandDetailModal recebe comentários em tempo real via Echo subscription com useState local, filtro por demandId, guard de deduplicacao D-06, e cleanup correto via stopListening.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-24T00:00:00Z
- **Completed:** 2026-04-24
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `DemandDetailModal.tsx` convertido para usar `useState<Comment[]>(demand.comments)` como estado local — comentários recebidos via broadcast são adicionados ao estado sem round-trip ao servidor
- Subscription Echo `.demand.comment.created` com filtro por `demandId` (T-06-10), guard de deduplicacao `prev.some(c => c.id === event.comment.id)` (D-06), e deps `[orgId, demand.id]` (T-06-11)
- Cleanup via `channel.stopListening` (nao `window.Echo.leave`) preserva o canal compartilhado com a subscription RT-01 em `Index.tsx`

## Task Commits

1. **Task 1: Converter demand.comments para useState + adicionar subscription Echo RT-02** - `b6fdaf1` (feat)

**Plan metadata:** (a ser adicionado com o commit do SUMMARY)

## Files Created/Modified

- `resources/js/Components/DemandDetailModal.tsx` — adicionados: interface `DemandCommentCreatedEvent`, `orgId` derivado do auth, `useState<Comment[]>`, useEffect de sync com prop, useEffect de subscription Echo RT-02 com filtro/guard/cleanup; substituidas referencias JSX `demand.comments.map` e `demand.comments.length` por `comments.map` e `comments.length`

## Decisions Made

- `channel.stopListening('.demand.comment.created')` no cleanup em vez de `window.Echo.leave(...)` — o canal `private-organization.{orgId}` e compartilhado com a subscription RT-01 do Kanban em `Index.tsx`. Usar `leave()` destruiria ambas as subscriptions.
- Array de dependencias do useEffect Echo: `[orgId, demand.id]` — garante que o cleanup + re-subscribe ocorre quando o usuario abre um modal diferente, evitando listeners acumulados.
- `event.comment as Comment`: o payload do broadcast tem `email?: string` (opcional) enquanto a interface `User` exige `email: string`. O cast e seguro porque o campo so e usado em exibicao e o backend sempre inclui o email no user payload (confirmado no 06-01-SUMMARY).

## Deviations from Plan

Nenhum — plano executado exatamente como escrito. O erro TypeScript em `DemandDetailModal.tsx` linha 70 (auth.organization shape mismatch) e pre-existente (POLISH-02 registrado no STATE.md) e nao foi introduzido por esta mudança.

## Issues Encountered

- Erro TypeScript pre-existente em `DemandDetailModal.tsx` linha 70 (`auth.organization` shape mismatch) e parte da divida tecnica POLISH-02 documentada no STATE.md. Nao introduzido por este plano, nao corrigido aqui (e um problema arquitetural de tipos globais — escopo de Phase 8).

## User Setup Required

Nenhum — a subscription usa o canal `private-organization.{orgId}` ja autorizado em `routes/channels.php` desde RT-01. Nenhuma configuracao adicional de servidor necessaria.

## Known Stubs

Nenhum. O estado `comments` e inicializado com `demand.comments` (dados reais do banco via Inertia) e atualizado com o payload broadcast construido 100% no servidor.

## Threat Flags

Nenhum novo threat surface. Mitigacoes do threat model do plano estao implementadas:
- T-06-10 (Spoofing): `if (event.demandId !== demand.id) return` — implementado
- T-06-11 (DoS por listener acumulado): `[orgId, demand.id]` como deps — implementado
- T-06-08 (Information Disclosure): canal `private-organization.{orgId}` ja autenticado via RT-01

## Next Phase Readiness

- RT-02 completo end-to-end: backend (06-01) + frontend (06-03) prontos
- User B ve comentario de User A aparecer em tempo real no modal sem refresh
- Cleanup correto: fechar o modal nao quebra o Kanban em tempo real (RT-01)
- Phase 7 (notificacoes in-app) pode seguir o mesmo padrao de subscription Echo com `useEffect` + `stopListening`

## Self-Check: PASSED

- `resources/js/Components/DemandDetailModal.tsx` — FOUND (modificado)
- Commit `b6fdaf1` — FOUND (git log)
- `const [comments, setComments] = useState<Comment[]>(demand.comments)` — FOUND (linha 102)
- `channel.listen('.demand.comment.created'` — FOUND (linha 115)
- `channel.stopListening('.demand.comment.created')` — FOUND (linha 129)
- `window.Echo.leave` ausente no codigo funcional — CONFIRMED
- `if (event.demandId !== demand.id) return` — FOUND (linha 117)
- `prev.some(c => c.id === event.comment.id)` — FOUND (linha 121)
- `}, [orgId, demand.id]);` — FOUND (linha 131)
- `interface DemandCommentCreatedEvent` — FOUND (linha 19)
- JSX usa `comments.map` e `comments.length` (nao `demand.comments.*`) — CONFIRMED

---
*Phase: 06-real-time-infrastructure*
*Completed: 2026-04-24*
