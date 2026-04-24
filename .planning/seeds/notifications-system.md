---
title: Notifications System
trigger_condition: "Quando houver usuários reais de agência usando o Briefy regularmente e o volume de atividade justificar alertas in-app"
planted_date: 2026-04-24
origin: Exploração de roadmap — depriorizado em favor de Mobile + PWA
requirements: RT-03, RT-04, RT-05, RT-06, RT-07
---

## Ideia

Sistema de notificações in-app via Laravel Reverb: bell badge no header com contagem de não-lidas, dropdown com notificações recentes (assignment, status change), mark as read.

## Requisitos preservados

- **RT-03**: Notificação quando demand é atribuída ao usuário
- **RT-04**: Notificação quando demand de sua propriedade muda de status
- **RT-05**: Badge de não-lidas no ícone de sino no header
- **RT-06**: Dropdown com notificações recentes (timestamp + contexto da demand)
- **RT-07**: Marcar individual ou todas como lidas

## Por que foi deferido

Em 2026-04-24, o produto ainda não tinha usuários reais. Mobile + PWA foi priorizado porque resolve um problema de layout concreto (scroll horizontal) e abre o produto para uso no celular, que tem maior valor para o estágio atual.

## Quando promover

- Usuários reais relatam "perdi uma atribuição" ou "não vi que o status mudou"
- Volume de demandas por organização > 20/semana (nível em que o acompanhamento manual fica difícil)
- Mobile + PWA já entregue

## Como promover

`/gsd-add-phase` e restaurar RT-03 a RT-07 em REQUIREMENTS.md + ROADMAP.md Coverage.
