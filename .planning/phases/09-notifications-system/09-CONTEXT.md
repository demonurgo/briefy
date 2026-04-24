# Phase 9: Notifications System — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Entregar notificações in-app em tempo real: criar `BriefyNotification` quando demands são atribuídas ou mudam de status, broadcast via Reverb, e atualizar o badge do bell no frontend sem polling.

O bell dropdown já existe (HTML + rotas REST). Esta fase adiciona: eventos de domínio, broadcast, e substituição do polling por Echo subscription.

</domain>

<decisions>
## Implementation Decisions

### Gatilhos de Notificação

- **D-01:** Atribuição (RT-03) — notificar **somente o usuário atribuído** (assignee). Não notificar o criador nem outros membros.
- **D-02:** Mudança de status (RT-04) — notificar **criador + assignee**, excluindo quem fez a mudança (sem auto-notificação).
- **D-03:** Não notificar quando assignee é nulo (demand sem responsável).
- **D-04:** Não notificar quando o usuário que dispara a ação é o mesmo que seria notificado.

### Canal de Broadcast

- **D-05:** Usar o canal existente `private-organization.{orgId}` — **não criar canal por usuário**.
- **D-06:** Evento dedicado: `notification.created` com payload `{ user_id, title, body, data }`.
- **D-07:** Frontend filtra pelo `user_id` do usuário logado — só processa notificações próprias.

### Badge em Tempo Real

- **D-08:** Echo escuta `notification.created` no canal da org; ao receber, **incrementa o contador localmente** sem round-trip ao servidor.
- **D-09:** Ao abrir o dropdown do bell, faz fetch das notificações (já implementado) para garantir consistência.
- **D-10:** Remover o `setInterval` de 30s do AppLayout — substituído pelo Echo subscription.

### Deduplicação

- **D-11:** Sem deduplicação por tempo — **uma notificação por mudança de status**. Cada ação gera exatamente uma BriefyNotification.

### Eventos de Domínio

- **D-12:** Criar dois eventos: `DemandAssigned` e `DemandStatusChanged`, seguindo o padrão de `DemandBoardUpdated` e `DemandCommentCreated` (ShouldBroadcastNow, PrivateChannel, broadcastAs).
- **D-13:** Disparar `DemandAssigned` no `DemandController` quando `assigned_to` muda de valor.
- **D-14:** Disparar `DemandStatusChanged` no `DemandController` quando `status` muda de valor.

</decisions>

<canonical_refs>
## Canonical References

### Padrão de broadcast existente
- `app/Events/DemandBoardUpdated.php` — Padrão: ShouldBroadcastNow + PrivateChannel org + broadcastAs
- `app/Events/DemandCommentCreated.php` — Mesmo padrão, payload diferente
- `app/Models/BriefyNotification.php` — Model existente (organization_id, user_id, type, title, body, data, read_at)

### Rotas existentes (não alterar)
- `routes/web.php` linhas 162-176 — GET /notifications, POST /notifications/{id}/read, POST /notifications/read-all

### Frontend bell existente
- `resources/js/layouts/AppLayout.tsx` — Bell component com openBell(), markAllRead(), handleNoteClick(), setInterval 30s (remover)

### Padrão Echo/Reverb
- `resources/js/pages/Demands/Index.tsx` — Padrão de subscription Echo (useEffect com channel.listen + cleanup)
- `resources/js/Components/DemandDetailModal.tsx` — Padrão stopListening cleanup

### Autorização de canais
- `routes/channels.php` — Regra `private-organization.{orgId}` já existente

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BriefyNotification` model: tabela pronta, fillable correto — só criar registros, não modificar schema
- Bell dropdown UI: HTML completo no AppLayout — só adicionar Echo subscription, remover setInterval
- Canal `private-organization.{orgId}`: autorizado e em uso — reaproveitar diretamente

### Established Patterns
- `ShouldBroadcastNow` + `PrivateChannel` + `broadcastAs()` — copiar de DemandBoardUpdated
- `useEffect` com `window.Echo.private(...).listen(...)` e cleanup `stopListening` — copiar de Index.tsx

### Integration Points
- `DemandController` (PATCH /demands/{id}) — ponto de disparo dos eventos
- `AppLayout.tsx` — ponto de subscription Echo para badge em tempo real

</code_context>

<specifics>
## Specific Ideas

- O badge deve incrementar **imediatamente** ao chegar o evento — sem esperar o dropdown ser aberto
- Ao clicar em uma notificação no dropdown, navegar para a demand relevante (via `data.demand_id`)
- O som de notificação (`playNotificationSound`) já existe no AppLayout — acionar também no Echo event

</specifics>

<deferred>
## Deferred Ideas

- Canal privado por usuário (`private-user.{userId}`) — considerado, descartado para v1.3 (canal da org é suficiente)
- Preferências de notificação por usuário (on/off por tipo) — v2
- Notificações por email/push nativa do OS — v2
- Deduplicação por janela de tempo — descartado, uma notificação por ação

</deferred>

---

*Phase: 09-notifications-system*
*Context gathered: 2026-04-24*
