# Phase 6: Real-time Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 06-real-time-infrastructure
**Areas discussed:** Kanban refresh (RT-01), Filtro self-update, Comentários ao vivo (RT-02), Granularidade do Observer

---

## Kanban refresh (RT-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Partial reload (Recomendado) | `router.reload({only: ['demands']})` — busca estado atual do servidor; simples, Inertia-idiomatic, ~100-200ms round-trip | ✓ |
| Payload-driven local state | Broadcast inclui `{demand_id, new_status}`; frontend move card no estado local sem round-trip | |
| Claude decide | Qualquer abordagem que mantenha DnD intacto | |

**User's choice:** Partial reload  
**Notes:** Consistente com o padrão `useEffect` já estabelecido no KanbanBoard. Simplicidade prevalece sobre latência mínima.

---

## Filtro self-update

| Option | Description | Selected |
|--------|-------------|----------|
| Permitir para todos (Recomendado) | Reload acontece também para quem triggerou; DnD já fez update otimista, reload confirma servidor | ✓ |
| Suprimir para quem triggerou | Payload inclui `userId`; frontend compara com `auth.user.id` e ignora se for o próprio usuário | |

**User's choice:** Permitir para todos  
**Notes:** Sem lógica extra de identificação. O reload confirma o estado do servidor após o DnD otimista.

---

## Comentários ao vivo (RT-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Payload + append local (Recomendado) | Evento `DemandCommentCreated` carrega `{id, body, user, created_at}`; modal appenda na lista local sem round-trip | ✓ |
| Evento simples + reload modal | Evento carrega só `{demand_id}`; modal chama `router.reload({only: ['selectedDemand']})` | |

**User's choice:** Payload + append local  
**Notes:** Evita round-trip e não reseta campos abertos no modal. Novo evento dedicado separado do `DemandBoardUpdated`.

---

## Granularidade do Observer

| Option | Description | Selected |
|--------|-------------|----------|
| Manter coarse-grained (Recomendado) | Observer continua disparando em toda mutação; recargas extras são inofensivas para v1.2 | ✓ |
| Filtrar no observer | Observer verifica `wasChanged('status') \|\| wasChanged('assigned_to')` antes de disparar | |

**User's choice:** Manter coarse-grained  
**Notes:** Sem mudanças no `DemandObserver`. Refinamento postergado para Phase 8 se necessário.

---

## Claude's Discretion

- Debounce para reloads rápidos sucessivos (implementação a cargo do planner)
- Estrutura do useEffect/useRef para gerenciar o canal Echo no modal
- Verificar se o submit de comentário já faz append otimista (para guardar dupla inserção em D-06)

## Deferred Ideas

- Observer filtering para campos específicos → Phase 8 Polish
- Live cursor/presence → v2 (já no roadmap como deferred)
