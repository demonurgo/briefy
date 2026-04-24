---
status: passed
phase: 05-dashboard-onboarding
source: [05-VERIFICATION.md]
started: 2026-04-23T00:00:00Z
updated: 2026-04-24T00:00:00Z
---

## Current Test

Verificação humana completa em 2026-04-24.

## Tests

### 1. Gráficos Recharts renderizam no browser com cores corretas
expected: PieChart (panorama geral), BarChart (prioridades), LineChart (criadas vs concluídas) visíveis com as cores do UI-SPEC (STATUS_COLORS e PRIORITY_COLORS)
result: passed

### 2. Toggle de view invisível para colaboradores
expected: usuário com role=member/collaborator não vê o toggle "Visão pessoal / Visão geral"; apenas admin/owner vê
result: passed

### 3. OnboardingChecklist aparece para novos usuários
expected: ao logar em org sem clientes nem demandas, o card "Primeiros passos" aparece no topo do dashboard
result: passed — comportamento correto para orgs novas. Observação do usuário: não há UI para criar uma segunda org em configurações; registrado como melhoria para v1.2 (não é bug da fase atual).

### 4. Dismiss persiste após reload de página
expected: clicar no X do OnboardingChecklist oculta o card imediatamente; ao recarregar a página o card não volta a aparecer
result: passed

### 5. ActivityFeed mostra eventos criados pelos observers em tempo real
expected: criar uma demanda, mudar status ou adicionar comentário → evento aparece no ActivityFeed do dashboard sem precisar recarregar manualmente
result: passed

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

Nenhum. Observação registrada: criação de nova organização por usuário existente não tem UI em /settings — sugestão para v1.2.
