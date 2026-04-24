---
phase: "05"
plan: "03"
subsystem: dashboard-components
tags: [dashboard, onboarding, react, components, animation, activity-feed]
dependency_graph:
  requires: ["05-01", "05-02"]
  provides: [DashboardStatusCard, DashboardSectionCard, ActivityFeed, OnboardingChecklist]
  affects: ["05-04"]
tech_stack:
  added: []
  patterns: [delta-indicator, optimistic-dismiss, router-patch-preferences, aria-roles, animation-stagger]
key_files:
  created:
    - resources/js/Components/DashboardStatusCard.tsx
    - resources/js/Components/DashboardSectionCard.tsx
    - resources/js/Components/ActivityFeed.tsx
    - resources/js/Components/OnboardingChecklist.tsx
  modified:
    - resources/css/app.css
decisions:
  - "deltaInverted prop em DashboardStatusCard inverte semântica de cor (verde/vermelho) para cards onde mais é ruim (Atrasadas)"
  - "dismiss otimístico no OnboardingChecklist: useState(false) esconde imediatamente, PATCH persiste em background"
  - "ActivityFeed usa FALLBACK_CONFIG para action_types desconhecidos — sem quebrar com novos eventos futuros"
  - "animationDelay prop em DashboardStatusCard suporta stagger (passado por Dashboard.tsx em 05-04)"
metrics:
  duration: "~10 minutos"
  completed: "2026-04-24"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 1
---

# Phase 05 Plan 03: Dashboard React Components Summary

**One-liner:** 4 componentes React do dashboard criados — DashboardStatusCard com delta indicator e stagger animation, DashboardSectionCard genérico, ActivityFeed com 8 action_types e roles ARIA, OnboardingChecklist com dismiss otimístico e PATCH preferences.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DashboardStatusCard, DashboardSectionCard e animação CSS | 4c240ed | DashboardStatusCard.tsx, DashboardSectionCard.tsx, app.css |
| 2 | ActivityFeed e OnboardingChecklist | ba89ad8 | ActivityFeed.tsx, OnboardingChecklist.tsx |

## What Was Built

### DashboardStatusCard (resources/js/Components/DashboardStatusCard.tsx)
Card de métrica com:
- Props: `label`, `count`, `delta` (null|number), `deltaInverted`, `icon` (LucideIcon), `iconColor`, `animationDelay`
- Delta indicator com ícones ArrowUp/ArrowDown/Minus e texto contextual ("↑ N vs ontem" / "↓ N vs ontem" / "— mesmo que ontem")
- `deltaInverted` para cards onde aumento é ruim (ex: "Atrasadas") — inverte cores verde/vermelho
- `role="region"` com `aria-label` para acessibilidade
- Classe `animate-fadeInUp` com `animationDelay` para stagger no Dashboard.tsx
- Design tokens: `rounded-[12px]`, `border-[#e5e7eb]`, `dark:border-[#1f2937]`, `bg-white dark:bg-[#111827]`

### DashboardSectionCard (resources/js/Components/DashboardSectionCard.tsx)
Wrapper genérico de seção com:
- Props: `title`, `children`, `action` (ReactNode opcional), `className` (override)
- Header com title e slot de action (ex: link "Ver todas →")
- Usado por ActivityFeed e disponível para Dashboard.tsx (05-04)

### ActivityFeed (resources/js/Components/ActivityFeed.tsx)
Feed de atividade com:
- Interface `ActivityEvent` exportada (id, action_type, subject_name, user_name, user_avatar?, metadata?, created_at)
- 8 action_types mapeados em ACTION_CONFIG com ícone Lucide e cor:
  - `demand.status_changed` → TrendingUp (#3b82f6)
  - `demand.created` → Plus (#10b981)
  - `demand.comment_added` → MessageCircle (#6b7280)
  - `demand.assigned` → Users (#8b5cf6)
  - `demand.archived` → Archive (#9ca3af)
  - `demand.restored` → RotateCcw (#f59e0b)
  - `client.created` → Building2 (#7c3aed)
  - `member.invited` → UserPlus (#7c3aed)
- FALLBACK_CONFIG (Activity icon) para action_types futuros
- verb() dinâmico por evento (usa metadata para contexto)
- Ícone com background `color + "1a"` (10% opacity via hex)
- `role="feed"` + `role="article"` por item (ARIA)
- Estado vazio: "Nenhuma atividade recente."
- subject_name renderizado como texto React (JSX escapa automaticamente — mitigação T-5-07)

### OnboardingChecklist (resources/js/Components/OnboardingChecklist.tsx)
Card de onboarding dismissível com:
- Props: `hasClients`, `hasDemands`, `onboardingDismissed?`
- Auto-hide: retorna null se `dismissed || onboardingDismissed || (hasClients && hasDemands)`
- Dismiss otimístico: `setDismissed(true)` imediato + `router.patch(route('settings.preferences'), { onboarding_dismissed: true }, { preserveState: true, preserveScroll: true })`
- 2 passos com CheckCircle/Circle visual e link "Começar →" quando incompleto
- Design tokens do DashboardPlanningWidget: `rounded-xl border border-[#a78bfa]/30 bg-[#7c3aed]/5`
- `aria-label="Dispensar guia de início"` no botão X

### Animação CSS (resources/css/app.css)
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fadeInUp {
  animation: fadeInUp 200ms ease-out both;
}
```

## Deviations from Plan

None — plano executado exatamente como escrito.

## Threat Model Compliance

| Threat | Mitigation Applied |
|--------|--------------------|
| T-5-07 — XSS via subject_name | subject_name renderizado como texto React ({event.user_name} / config.verb(event)) — JSX escapa automaticamente. dangerouslySetInnerHTML nunca usado. |
| T-5-08 — PATCH payload injection | Payload fixo `{ onboarding_dismissed: true }` — sem dados do usuário no payload |
| T-5-02 — PATCH /settings/preferences | Backend allowlist corrigida em 05-01 cobre este campo |

## Self-Check: PASSED

Arquivos criados:
- [x] resources/js/Components/DashboardStatusCard.tsx — EXISTS
- [x] resources/js/Components/DashboardSectionCard.tsx — EXISTS
- [x] resources/js/Components/ActivityFeed.tsx — EXISTS
- [x] resources/js/Components/OnboardingChecklist.tsx — EXISTS
- [x] resources/css/app.css — MODIFIED (animate-fadeInUp adicionado)

Commits:
- [x] 4c240ed — feat(05-03): DashboardStatusCard, DashboardSectionCard e animação fadeInUp
- [x] ba89ad8 — feat(05-03): ActivityFeed e OnboardingChecklist

TypeScript: zero erros nos novos arquivos (npx tsc --noEmit).
