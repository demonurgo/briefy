# Phase 7: Mobile + PWA - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 07-mobile-pwa
**Areas discussed:** Kanban no mobile, PWA scope, Dashboard mobile, Demand modal no mobile

---

## Kanban no Mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Scroll horizontal no Kanban | Manter colunas side-by-side; corrigir vazamento do scroll para a página | ✓ |
| Lista com badge de status | Kanban vira lista com badge de status no mobile | |
| Uma coluna por vez | Swipe entre colunas como Trello mobile | |

**User's choice:** Scroll horizontal no Kanban
**Notes:** Menor mudança, base já existe (overflow-x-auto no KanbanBoard)

---

## Drag-and-drop no mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Só visualização | No mobile só abre modal, não arrasta | |
| Touch drag-and-drop | Arrastar com toque — @dnd-kit suporta nativamente | ✓ |

**User's choice:** Touch drag-and-drop
**Notes:** @dnd-kit já está instalado e suporta TouchSensor nativamente

---

## PWA Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Installable + cache shell | manifest.json + service worker com cache do shell | |
| Só installable | Apenas manifest.json + ícones, sem service worker | ✓ |
| Offline completo | Cache de dados da API também | |

**User's choice:** Só installable
**Notes:** Service worker adiado — complexidade não justifica agora

---

## Dashboard mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Stack vertical simples | Grid vira coluna única, mesmo conteúdo | ✓ |
| Reduzir conteúdo | Esconder/colapsar cards no mobile | |

**User's choice:** Stack vertical simples
**Notes:** Zero mudança de conteúdo, só layout

---

## Demand Modal no Mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Tela cheia no mobile | 100vw × 100dvh no mobile, botão X para fechar | ✓ |
| Bottom sheet | Desliza de baixo, arrastar para fechar | |
| Ajuste mínimo | Só corrigir overflow sem redesign | |

**User's choice:** Tela cheia no mobile

---

## Claude's Discretion

- Breakpoint de corte: `md:` (768px) — consistente com BottomNav existente
- Animação do modal mobile: Claude decide
- Ícones PWA: Claude usa logo existente do projeto

## Deferred Ideas

- Service worker / cache offline — complexidade não justifica agora
- Animações de transição de página no mobile
- Pull-to-refresh no Kanban mobile
