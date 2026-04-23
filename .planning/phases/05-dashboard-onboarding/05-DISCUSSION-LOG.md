# Phase 5: Dashboard + Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 05-dashboard-onboarding
**Areas discussed:** Views/Toggle, Feed de Atividade, Gráficos, Onboarding, Status Cards, Saudação, Eventos do Feed

---

## Views — Estrutura do Dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| Uma página, conteúdo condicional | Admin vê cards gerais da org + gráficos de equipe abaixo dos próprios. Mesma URL /dashboard. | |
| Duas views com toggle | Botão "Visão pessoal / Visão geral" no header para admin alternar. | ✓ |
| Duas páginas separadas | /dashboard e /dashboard/admin — admin tem link separado. | |

**User's choice:** Duas views com toggle — admin vê o toggle para alternar entre visão pessoal e gerencial.

---

## Feed de Atividade

| Option | Description | Selected |
|--------|-------------|----------|
| Tabela activity_logs no BD | Nova tabela de eventos. Aparece como card no dashboard. | ✓ |
| Derivado de dados existentes | Busca nas tabelas existentes sem migration adicional. | |
| Dentro da tabela "Minhas demandas" | Feed é simplesmente demandas recentes ordenadas por updated_at. | |

**User's choice:** Tabela activity_logs no BD (Recomendado)

---

## Gráficos — Biblioteca

| Option | Description | Selected |
|--------|-------------|----------|
| Recharts | Leve, componentes React nativos, donut/bar/line. | ✓ |
| react-chartjs-2 | Wrapper do Chart.js. Mais pesado, canvas-based. | |
| Chart.js direto | Mais controle, mais código de glue. | |

**User's choice:** Recharts

---

## Onboarding Checklist

| Option | Description | Selected |
|--------|-------------|----------|
| Card dismissível no dashboard | Card no topo com checkboxes. Some ao marcar tudo ou dispensar. | ✓ |
| Banner sticky no topo | Barra persistente abaixo do header. | |
| Modal de boas-vindas | Pop-up na primeira visita. | |

**User's choice:** Card dismissível no dashboard (Recomendado)

---

## Status Cards — Dados de quem?

| Option | Description | Selected |
|--------|-------------|----------|
| Pessoal para todos, org para admin | Colaborador vê próprios dados. Admin vê org na visão geral. | ✓ |
| Sempre da org inteira | Todos veem números da organização. | |

**User's choice:** Pessoal para todos, org para admin via toggle

---

## Saudação

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, manter o greeting | "Olá, [nome]! 👋" + subtítulo contextual. | ✓ |
| Sem greeting, só título | Apenas "Painel" como título. | |

**User's choice:** Manter o greeting exatamente como nas referências

---

## Eventos do Feed de Atividade

**User's choice:** Todos os 4 selecionados + o que mais for relevante. Scoping: admin vê tudo da org; colaborador vê apenas o relevante para si. O usuário também enviou imagens de referência visual do dashboard (duas screenshots) que foram incorporadas nas decisões de layout do CONTEXT.md.

**Eventos selecionados:**
- Mudança de status da demanda ✓
- Criação de demanda ✓
- Comentários em demandas ✓
- Atribuição de membro ✓
- + eventos adicionais: arquivamento, restauração, criação de cliente, convite de membro (admin)

**Notes:** Usuário quer que apareça apenas o que é relevante para o usuário logado. Admin deve ver mais dados.

---

## Referências Visuais

O usuário compartilhou 2 imagens de referência detalhadas mostrando o layout esperado do dashboard, que foram analisadas e incorporadas às decisões D-07 a D-19 no CONTEXT.md.

## Deferred Ideas

- "Filtros rápidos" (botão nas referências) — feature separada
- Meta semanal configurável — requer novo campo de configuração
- Tempo médio de entrega como KPI — não está nos requirements
