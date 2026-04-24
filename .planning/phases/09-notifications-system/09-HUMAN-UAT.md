---
status: resolved
phase: 9-notifications-system
source: [09-VERIFICATION.md]
started: 2026-04-24T21:00:00Z
updated: 2026-04-24T21:30:00Z
---

## Current Test

Aprovado pelo usuário em 2026-04-24.

## Tests

### 1. Badge incrementa em tempo real
expected: Badge do sino do Usuário A incrementa sem refresh de página quando Usuário B atribui uma demanda
result: approved

### 2. Notificação aparece no dropdown com contexto correto
expected: Título da demanda, tipo do evento e timestamp visíveis no dropdown
result: approved

### 3. Navegação ao clicar na notificação
expected: Clicar na notificação navega para demands.index com o demand correto
result: approved

### 4. Ausência de polling na aba Network
expected: Nenhuma request de polling para /demands aparece após 35 segundos
result: approved

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
