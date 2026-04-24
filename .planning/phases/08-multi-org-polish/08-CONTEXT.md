# Phase 8: Multi-Org + Polish — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 entrega quatro melhorias independentes:
1. **MORG-01** — Criação de nova organização direto do OrgSwitcher na navbar
2. **POLISH-01** — Unificação do padrão SSE: estender useAiStream para suportar GET SSE e migrar ClientResearchTimelineModal
3. **POLISH-02** — Zero erros TypeScript: corrigir o tipo global PageProps + AiIcon size enum
4. **POLISH-03** — Conversation picker no ChatTab: dropdown para selecionar conversas anteriores de IA

Fora de escopo: qualquer nova feature além dessas quatro, billing, portal do cliente.

</domain>

<decisions>
## Implementation Decisions

### MORG-01 — Multi-org creation

- **D-01:** Ponto de entrada: botão `+ Criar organização` **no OrgSwitcher dropdown da navbar** (ao final da lista de orgs, separado por um divider). Não na tab Organization do /settings.
- **D-02:** Ao clicar, abre um **modal simples** com dois campos: Nome (obrigatório) e Slug (gerado automaticamente a partir do nome, editável). Botões: Cancelar e Criar.
- **D-03:** Após criar com sucesso: **auto-switch para a nova org** e redirect para /dashboard. A nova org aparece imediatamente no OrgSwitcher.
- **D-04:** Slug gerado automaticamente via JS ao digitar o nome (slugify: lowercase, hífens, sem acentos). Usuário pode editar manualmente antes de criar.
- **D-05:** O criador da nova org recebe role `owner` automaticamente (padrão do backend já existente).

### POLISH-03 — Conversation picker (ChatTab)

- **D-06:** UI: **dropdown no header do ChatTab**, ao lado de "Chat IA". Label padrão: nome/data da conversa atual ou "Conversa atual". Seta `▾` indica que é clicável.
- **D-07:** Por conversa no dropdown: **data + contagem de mensagens** — ex: "24 Abr — 8 msgs". Se a conversa tiver `title`, usar o title; senão, usar data.
- **D-08:** Ao selecionar uma conversa anterior no dropdown, o ChatTab troca o `conv` local (sem reload do modal). O input e streaming ficam desabilitados para conversas antigas (read-only) — só a conversa ativa aceita novas mensagens.
- **D-09:** O botão `+ Nova conversa` permanece no header (ao lado do dropdown ou abaixo dele). Cria nova conversa e auto-seleciona no dropdown.
- **D-10:** O backend já carrega `demand.conversations[]` no DemandController. O frontend precisa apenas da UI do picker — nenhuma rota nova necessária para listar conversas.

### POLISH-01 — SSE consolidation

- **D-11:** Estender `useAiStream` para suportar **GET SSE com custom events** (além do POST delta-frame atual). A API do hook ganha `method: 'GET'` e `onEvent: (type, data) => void` para lidar com event types customizados (`progress`, `step`, `done`, `error`).
- **D-12:** Migrar `ClientResearchTimelineModal.tsx` para usar `useAiStream` com `method: 'GET'`. Remover o bloco `useEffect` com `new EventSource(...)` diretamente.
- **D-13:** O hook continua chamando-se `useAiStream`. O ARCH NOTE em ClientResearchTimelineModal é removido após a migração. A distinção POST/GET passa a ser encapsulada internamente no hook.
- **D-14:** Garantir que a migração não quebre o comportamento de reconnect do EventSource nativo — implementar retry/reconnect dentro do hook se necessário.

### POLISH-02 — TypeScript zero errors

- **D-15:** **Meta: `npx tsc --noEmit` retorna 0 erros** após a fase.
- **D-16:** Corrigir o tipo **global `PageProps`** (provavelmente em `resources/js/types/index.d.ts` ou via `declare module '@inertiajs/react'`) para incluir todos os campos reais enviados pelo servidor: `role`, `organization` (com `has_anthropic_key`, `anthropic_api_key_mask`, etc.), `current_organization_id`, `organizations[]`. Fix na raiz — nenhum arquivo precisa de cast local.
- **D-17:** Para o **AiIcon size enum**: adicionar os tamanhos `11` e `14` à lista de valores aceitos (ou trocar os call sites para valores válidos como `12` e `16`, conforme mais simples). Critério: não alterar visualmente nenhum ícone existente.
- **D-18:** Corrigir todos os demais erros TypeScript listados no output do tsc (Demands/Trash.tsx, Clients/Edit.tsx, Clients/Show.tsx, PlanningItemModal.tsx, Sidebar.tsx, etc.) seguindo a mesma abordagem de fix na raiz — sem `as any`.

### Claude's Discretion

- Estrutura interna do useAiStream estendido (como separar POST/GET internamente)
- Se adicionar `11` e `14` ao enum ou trocar call sites — escolher o que não altera visualmente
- Layout exato do dropdown do conversation picker dentro do header existente do ChatTab
- Ordem dos campos no modal de criar org (Nome primeiro, Slug segundo)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Código existente a estender
- `resources/js/hooks/useAiStream.ts` — Hook a ser estendido para GET SSE (POLISH-01)
- `resources/js/Components/ClientResearchTimelineModal.tsx` — Arquivo a migrar do EventSource nativo para useAiStream (POLISH-01)
- `resources/js/Components/ChatTab.tsx` — Arquivo a receber o conversation picker (POLISH-03)
- `resources/js/Layouts/AppLayout.tsx` — OrgSwitcher a receber o botão + modal de criar org (MORG-01)
- `resources/js/types/index.d.ts` — Tipos globais a corrigir (POLISH-02)

### Contexto de estado
- `.planning/STATE.md` — Lista de erros TypeScript pré-existentes a zerar
- `.planning/phases/07-mobile-pwa/07-03-SUMMARY.md` — Confirma 15 erros TS pré-existentes antes da Phase 8

### Arquivos com erros TS conhecidos (POLISH-02)
Todos listados pelo `npx tsc --noEmit`:
- `resources/js/Components/BriefTab.tsx`
- `resources/js/Components/ChatTab.tsx`
- `resources/js/Components/DemandDetailModal.tsx`
- `resources/js/Components/FlashMessage.tsx`
- `resources/js/Components/PlanningItemModal.tsx`
- `resources/js/Components/Sidebar.tsx`
- `resources/js/pages/Clients/Edit.tsx`
- `resources/js/pages/Clients/Index.tsx`
- `resources/js/pages/Clients/Show.tsx`
- `resources/js/pages/Demands/Show.tsx`
- `resources/js/pages/Demands/Trash.tsx`
- `resources/js/pages/Planejamento/Index.tsx`
- `resources/js/hooks/useTheme.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OrgSwitcher` em AppLayout.tsx (linhas ~199-260): dropdown já implementado com lista de orgs, ref, estado open/close — apenas adicionar divider + botão + modal trigger
- `demand.conversations[]`: já carregado pelo DemandController; ChatTab já gerencia `conv` state local — adicionar dropdown que troca `conv` via `setConv`
- `useAiStream`: hook fetch+ReadableStream para POST delta-frame — estender adicionando branch para GET+EventSource internamente
- Padrão de modal: `fixed inset-0 z-50 flex items-center justify-center bg-black/40` já usado em DemandDetailModal, GenerateModal — reusar para o modal de criar org

### Established Patterns
- Slugify em JS: provavelmente implementar inline no form (`name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')`)
- OrgSwitcher usa `setOrgSwitcherOpen(false)` para fechar — modal de criar org deve também fechar o dropdown
- Inertia `router.post()` com `onSuccess/onFinish` para POST actions (padrão de toda a app)
- ChatTab usa `setConv(...)` local + `useEffect` para sync com `demand.conversations` — picker troca `conv` localmente

### Integration Points
- Rota backend para criar org: verificar se `POST /organizations` já existe ou precisa ser criada
- OrgSwitcher após criação: `router.patch(route('settings.current-org'), { organization_id: newOrg.id })` já existe para switch
- ChatTab read-only para conversas antigas: desabilitar o textarea e o botão de envio quando `conv.id !== latestConv.id`

</code_context>

<specifics>
## Specific Ideas

- Modal de criar org: visual consistente com os outros modais da app (rounded-[16px], bg-[#f9fafb] dark:bg-[#0b0f14], shadow-2xl)
- Conversation picker label: se `conv.title` existe, usar; senão `"${date} — ${n} msgs"` formatado em pt-BR
- Dropdown do picker: usar o mesmo padrão visual do OrgSwitcher (absolute right-0, w-56, rounded-[12px], border, shadow-lg)

</specifics>

<deferred>
## Deferred Ideas

- Logo upload no modal de criar org — apenas Nome + Slug nesta fase, logo pode ser configurada depois em /settings
- Renomear/excluir organização — fora do escopo desta fase
- Conversation titles auto-gerados por IA — apenas display de título existente; geração automática é v2
- Offline cache completo (sw.js) — D-06 da Phase 7, deferred

</deferred>

---

*Phase: 08-multi-org-polish*
*Context gathered: 2026-04-24*
