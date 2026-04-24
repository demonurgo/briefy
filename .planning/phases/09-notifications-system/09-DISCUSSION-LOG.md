# Phase 9: Notifications System — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-24
**Phase:** 09-notifications-system
**Areas discussed:** Gatilhos de notificação, Canal de broadcast, Badge em tempo real, Deduplicação

---

## Gatilhos de Notificação

| Option | Description | Selected |
|--------|-------------|----------|
| Só o usuário atribuído | Notifica apenas quem recebeu a tarefa | ✓ (atribuição) |
| Atribuído + criador | Notifica quem recebeu e quem criou | |
| Todos os membros da org | Todos veem todas as atribuições | |
| Criador e assignee | Exclui quem mudou o status | ✓ (status change) |
| Só o criador | Apenas quem criou a demand | |

**Atribuição:** Só o usuário atribuído
**Status change:** Criador e assignee (excluindo quem fez a mudança)

---

## Canal de Broadcast

| Option | Description | Selected |
|--------|-------------|----------|
| Canal da org com evento dedicado | 'notification.created' no private-organization.{orgId} | ✓ |
| Canal privado por usuário | private-user.{userId} por usuário | |

**Escolha:** Canal da org existente com evento `notification.created`

---

## Badge em Tempo Real

| Option | Description | Selected |
|--------|-------------|----------|
| Echo incrementa localmente | Sem round-trip, mais rápido | ✓ |
| Echo dispara router.reload | Partial reload de unread_notifications | |

**Escolha:** Incremento local ao receber evento. Fetch na abertura do dropdown.

---

## Deduplicação

| Option | Description | Selected |
|--------|-------------|----------|
| 1 por demand por tipo por minuto | Throttle, evita spam | |
| Uma por mudança de status | Cada ação gera uma notificação | ✓ |
| Sem deduplication | Envia sempre | |

**Escolha:** Uma notificação por mudança de status, sem throttle por tempo.

---

## Claude's Discretion

- Sound: acionar `playNotificationSound` no Echo event (padrão já existe)
- Navegação: usar `data.demand_id` no click handler (já implementado no AppLayout)
