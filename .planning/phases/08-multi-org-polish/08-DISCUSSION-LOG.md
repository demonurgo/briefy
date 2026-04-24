# Phase 8: Multi-Org + Polish — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 08-multi-org-polish
**Areas discussed:** Multi-org creation UX, Conversation picker, SSE consolidation scope, TypeScript scope

---

## Multi-org creation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Na tab Organization do /settings | Botão inline abaixo das infos da org atual | |
| No OrgSwitcher dropdown (navbar) | Botão `+ Criar organização` no fim da lista de orgs | ✓ |

**User's choice:** OrgSwitcher dropdown

| Option | Description | Selected |
|--------|-------------|----------|
| Modal simples | Nome + Slug auto-gerado, botão Criar | ✓ |
| Inline no dropdown | Campos expandem dentro do dropdown | |

**User's choice:** Modal simples (Nome + Slug)

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-switch para a nova org | Redirect para /dashboard da nova org | ✓ |
| Fica na org atual | Nova org no switcher, troca manual | |

**User's choice:** Auto-switch imediato após criação

---

## Conversation Picker

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown no header do ChatTab | Seletor discreto no topo, troca conversa localmente | ✓ |
| Histórico expandido abaixo | Seção colapsável depois das mensagens atuais | |

**User's choice:** Dropdown no header

| Option | Description | Selected |
|--------|-------------|----------|
| Data + contagem de mensagens | Ex: "24 Abr — 8 msgs" | ✓ |
| Título gerado + data | Usa campo `title` se existir | |

**User's choice:** Data + contagem (com fallback para title se existir)

---

## SSE Consolidation Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Estender useAiStream para GET SSE | Hook unificado, migrar ClientResearchTimelineModal | ✓ |
| Apenas documentar a separação | ADR formal, manter dois padrões | |

**User's choice:** Estender useAiStream — um hook para todos os streams

---

## TypeScript Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Zero erros TS no codebase | Todos os 15+ erros eliminados | ✓ |
| Só os erros listados no STATE.md | auth.organization + AiIcon apenas | |

**User's choice:** Zero erros — `npx tsc --noEmit` retorna 0

| Option | Description | Selected |
|--------|-------------|----------|
| Corrigir o tipo global PageProps | Fix na raiz, todos os arquivos corretos | ✓ |
| Cast local em cada arquivo | `as any` nos arquivos afetados | |

**User's choice:** Corrigir PageProps global

---

## Deferred Ideas

- Logo upload no modal de criar org (só Nome + Slug nesta fase)
- Renomear/excluir organização
- Conversation titles auto-gerados por IA
