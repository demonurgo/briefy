---
status: partial
phase: 06-real-time-infrastructure
source: [06-VERIFICATION.md]
started: 2026-04-24T00:00:00Z
updated: 2026-04-24T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. RT-01 live Kanban update
expected: User A arrasta card para nova coluna → User B (mesmo org, mesma página /demands) vê o card na nova posição sem precisar de refresh. Debounce de 300ms deve agrupar drags rápidos.
result: [pending]

### 2. RT-02 live comments no modal
expected: User A posta comentário via modal de uma demanda → User B com o mesmo modal aberto vê o comentário aparecer no thread sem fechar/reabrir. Sem duplicatas.
result: [pending]

### 3. Não-regressão canal compartilhado (stopListening vs leave)
expected: User B fecha o modal da demanda → A subscription RT-01 do Kanban continua funcionando (não foi derrubada pelo `leave`). User A arrasta outro card → User B ainda vê no Kanban.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
