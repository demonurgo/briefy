# Phase 7: Mobile + PWA - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Tornar o Briefy utilizável e visualmente polido em dispositivos mobile (375px+), corrigindo o scroll horizontal que vaza para fora das páginas, adaptando o layout das telas principais, e adicionando suporte a instalação PWA (manifest + ícones).

**In scope:** fix do scroll horizontal, Kanban responsivo com touch drag-and-drop, DemandDetailModal tela cheia no mobile, Dashboard stack vertical, manifest PWA + ícones.

**Out of scope:** service worker / cache offline (decisão D-06 — só manifest), notificações push (Phase futura), criação de nova organização, dívida TypeScript (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Kanban no Mobile

- **D-01:** Layout — **scroll horizontal dentro do Kanban**. Manter as colunas side-by-side; o usuário dá swipe para ver outras colunas. Corrigir o scroll horizontal que "vaza" para a página inteira (isolá-lo dentro do componente KanbanBoard com `overflow-x: hidden` no container pai).
- **D-02:** Drag-and-drop — **touch drag-and-drop habilitado**. @dnd-kit já suporta touch nativamente — não requer biblioteca adicional. Verificar se TouchSensor está configurado no DragContext; adicionar se não estiver.

### Demand Modal no Mobile

- **D-03:** O `DemandDetailModal` deve ocupar **tela cheia no mobile** (100vw × 100dvh). Fechar com botão X ou swipe down. Implementar com classes Tailwind `max-sm:inset-0 max-sm:rounded-none` ou equivalente. Tabs (Brief, Chat, Comentários) ficam como estão — não alterar estrutura de conteúdo.

### Dashboard no Mobile

- **D-04:** Grid de cards vira **coluna única** no mobile (stack vertical). Stats no topo, planning widget, activity feed embaixo. Zero mudança de conteúdo — apenas breakpoint responsivo. Mesma informação, layout adaptado.

### PWA

- **D-05:** Escopo PWA = **só installable**. Entregar:
  - `manifest.json` com `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`
  - Ícones nas resoluções padrão (192×192, 512×512, maskable)
  - `<link rel="manifest">` no `<head>` do layout Blade
  - **Sem** service worker nesta fase.
- **D-06:** Service worker / cache offline — **adiado**. Complexidade de sincronização não justifica para o estágio atual do produto.

### Fix do Scroll Horizontal (raiz do problema)

- **D-07:** O scroll horizontal que aparece no mobile vem de elementos com largura fixa (KanbanBoard, tabelas, modais). Abordagem: adicionar `overflow-x: hidden` no `<body>` ou no container raiz do AppLayout, e garantir que o Kanban encapsule seu próprio scroll com `overflow-x: auto` internamente.

### Claude's Discretion

- Breakpoints: usar `md:` como ponto de corte principal (768px) — consistente com o `BottomNav` existente que já usa `md:hidden`.
- Animação do modal mobile (tela cheia): simples fade/slide — Claude decide o detalhe.
- Ícones PWA: Claude pode gerar/usar o logo existente do projeto; se não houver SVG adequado, usar placeholder e documentar no SUMMARY.
- Qual viewport meta tag confirmar ou adicionar no layout Blade — Claude verifica.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Layout e Componentes Existentes
- `resources/js/Layouts/AppLayout.tsx` — container principal; `min-w-0 overflow-hidden` já no flex container; `overflow-auto` no main
- `resources/js/Components/BottomNav.tsx` — navegação mobile (`md:hidden`); padrão de breakpoint estabelecido
- `resources/js/Components/KanbanBoard.tsx` — linha 245: `overflow-x-auto kanban-scroll` no container de colunas; D-01 isola este overflow
- `resources/js/Components/DemandDetailModal.tsx` — modal com tabs; D-03 aplica tela cheia no mobile

### DnD
- `package.json` — `@dnd-kit/core ^6.3.1`, `@dnd-kit/utilities ^3.2.2`; verificar TouchSensor no DragContext para D-02

### PWA
- `resources/views/app.blade.php` (ou equivalente) — onde adicionar `<link rel="manifest">` e viewport meta

### Requirements
- `.planning/REQUIREMENTS.md` — MOB-01 a MOB-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BottomNav.tsx` — já usa `md:hidden`; padrão de breakpoint para "mobile only"
- `AppLayout.tsx` — `min-w-0 overflow-hidden` no flex-1 container; `overflow-auto` no main — base para fix de scroll
- @dnd-kit — suporte a touch nativo; só precisar adicionar TouchSensor se não estiver configurado

### Established Patterns
- Breakpoint `md:` (768px) é o ponto de corte mobile/desktop estabelecido pelo BottomNav
- Tailwind CSS para responsividade — sem CSS modules ou styled-components
- `dvh` units podem ser usados para altura de viewport mobile (evita problema com barra do browser)

### Integration Points
- `AppLayout.tsx` — container raiz para fix de `overflow-x: hidden`
- `DragContext` (onde @dnd-kit é configurado) — adicionar `TouchSensor` para D-02
- Blade layout — adicionar `<link rel="manifest">` e ajustar viewport meta

</code_context>

<specifics>
## Specific Ideas

- Ícone PWA: usar o logo/branding existente do Briefy; adaptar para maskable icon
- O `BottomNav` já cobre a navegação principal mobile — não recriar

</specifics>

<deferred>
## Deferred Ideas

- **Service worker / cache offline** — adiado (D-06); promover quando produto tiver usuários recorrentes que se beneficiem de carregamento offline
- **Animações de transição de página** no mobile (slide entre páginas) — escopo seria muito amplo para Phase 7
- **Pull-to-refresh** no Kanban mobile — poderia ser interessante, mas não é um problema reportado

</deferred>

---

*Phase: 07-mobile-pwa*
*Context gathered: 2026-04-24*
