---
phase: 08-multi-org-polish
plan: "04"
subsystem: ui
tags: [react, inertia, useform, modal, multi-org, typescript]

requires:
  - phase: 08-multi-org-polish
    plan: "02"
    provides: "OrganizationController@store registrado como POST /organizations (organizations.store)"
  - phase: 08-multi-org-polish
    plan: "03"
    provides: "Zero TypeScript errors — AppLayout.tsx usa global PageProps sem interface local"

provides:
  - "OrgSwitcher '+ Criar nova organização' wired: botão clickável (não mais disabled) fecha dropdown e abre modal"
  - "CreateOrgModal inline em AppLayout.tsx: campos Nome (required) + Slug (auto-gerado, editável)"
  - "Slug auto-gerado via toSlug() em JS: lowercase, hífens, sem acentos (NFD)"
  - "Submissão via Inertia useForm postOrg(route('organizations.store')): onSuccess fecha modal + reset"
  - "Erros de validação server-side exibidos sob os campos Nome e Slug via orgErrors"
  - "npx tsc --noEmit continua em 0 erros após as mudanças"

affects: [08-05, 08-06, 08-07]

tech-stack:
  added: []
  patterns:
    - "useForm inline em AppLayout para POST de criação de org — evita arquivo separado para modal simples"
    - "setOrgSwitcherOpen(false) antes de setCreateOrgOpen(true) — evita race condition do Pitfall 4 (outside-click handler)"
    - "toSlug() inline: normalize NFD + replace accent chars + hyphenate — slugify sem dependência externa"
    - "stopPropagation no inner div do modal — previne fechar acidental ao clicar dentro"

key-files:
  created: []
  modified:
    - resources/js/Layouts/AppLayout.tsx

key-decisions:
  - "Modal implementado inline em AppLayout.tsx (sem arquivo separado) — escopo limitado e componente já gerencia o estado relacionado"
  - "setOrgSwitcherOpen(false) executado ANTES de setCreateOrgOpen(true) — previne que o outside-click handler do OrgSwitcher descarte o open do modal (Pitfall 4 do RESEARCH.md)"
  - "useForm com aliases (orgData/setOrgData/postOrg etc.) evita conflito de nomes com variáveis do AppLayout"

patterns-established:
  - "Modal de criação de recurso: useForm inline + estado local + stopPropagation — padrão para modais simples sem arquivo separado"

requirements-completed:
  - MORG-01

duration: 12min
completed: "2026-04-24"
---

# Phase 8 Plan 04: OrgSwitcher Wiring + CreateOrgModal Summary

**Botão '+ Criar nova organização' ativado no OrgSwitcher e modal inline implementado com Inertia useForm POSTando para organizations.store, slug auto-gerado via toSlug() e erros server-side exibidos**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-24T17:30:00Z
- **Completed:** 2026-04-24T17:42:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Importado `useForm` de `@inertiajs/react` no AppLayout.tsx
- Adicionado estado `createOrgOpen` ao lado de `orgSwitcherOpen` (sem interferência)
- Adicionado `useForm({ name: '', slug: '' })` com aliases `orgData/setOrgData/postOrg/orgProcessing/orgErrors/resetOrg`
- Adicionado `toSlug()`: `normalize('NFD')` + strip de acentos + substituição por hífens + trim de hífens
- Adicionado `handleCreateOrg`: previne default, chama `postOrg(route('organizations.store'))` com `onSuccess` que fecha modal e reseta form
- Substituído botão `disabled` com `cursor-not-allowed` e `opacity-50` por botão funcional com `onClick` que fecha dropdown e abre modal
- Adicionado `CreateOrgModal` no final do JSX (antes do `</div>` raiz): overlay com `bg-black/40`, inner div `rounded-[16px] shadow-2xl`, campos Nome e Slug com validação visual
- `npx tsc --noEmit` continua em 0 erros

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Wire OrgSwitcher button + implement CreateOrgModal in AppLayout.tsx** - `7374267` (feat)

## Files Created/Modified

- `resources/js/Layouts/AppLayout.tsx` — Adicionado `useForm` import; estado `createOrgOpen`; hooks `useForm`+`toSlug`+`handleCreateOrg`; botão disabled substituído por botão com onClick; modal `CreateOrgModal` inline no final do JSX

## Decisions Made

- Modal implementado inline em AppLayout.tsx sem criar arquivo separado — escopo limitado justifica manter tudo no mesmo componente que já gerencia o estado OrgSwitcher relacionado
- `setOrgSwitcherOpen(false)` executado antes de `setCreateOrgOpen(true)` — mitiga Pitfall 4 do RESEARCH.md: o outside-click handler do OrgSwitcher poderia interceptar o clique e o modal nunca abriria
- Aliases para useForm (`orgData`, `setOrgData`, `postOrg`, `orgProcessing`, `orgErrors`, `resetOrg`) evitam colisão com variáveis existentes no escopo do componente

## Deviations from Plan

None - plano executado exatamente como escrito.

## Verification Results

```
grep -n "setCreateOrgOpen" AppLayout.tsx → 5 ocorrências (linha 38, 111, 249, 273, 321)
grep -n "disabled" AppLayout.tsx | grep "Criar" → sem resultado (botão não é mais disabled)
grep -n "organizations.store" AppLayout.tsx → linha 110 (postOrg call)
grep -n "toSlug" AppLayout.tsx → linha 102 (definição) + linha 292 (uso no onChange)
grep -n "cursor-not-allowed" AppLayout.tsx → sem resultado (removido)
grep -n "rounded-\[16px\]" AppLayout.tsx → linha 276 (modal inner div)
grep -n "shadow-2xl" AppLayout.tsx → linha 276 (modal inner div)
npx tsc --noEmit → 0 erros (saída vazia)
```

## Issues Encountered

Nenhum — as mudanças foram aplicadas sem complicações. O arquivo já estava no estado correto após o Plan 03 (global PageProps, sem interface local), então `useForm` pôde ser adicionado sem conflito de tipos.

## Known Stubs

Nenhum — o botão está funcional e o modal submete para a rota real `organizations.store`. Não há placeholders ou dados mockados.

## Threat Flags

Nenhuma superfície nova além do que está no threat model do plano:
- POST /organizations: CSRF token incluído automaticamente pelo Inertia useForm (T-08-04-01 mitigado)
- Slug: validação client-side é conveniência apenas; server valida `alpha_dash|unique:organizations,slug` (T-08-04-02 aceito)
- orgErrors: erros de validação são feedback intencional ao usuário; nenhum dado sensível exposto (T-08-04-03 aceito)

## Next Phase Readiness

- MORG-01 completo: backend (Plan 02) + frontend (Plan 04) — usuário pode criar nova org direto do OrgSwitcher
- Plans 05-07 (POLISH-01, POLISH-03, e quaisquer outros) são independentes deste plano e podem prosseguir normalmente
- TypeScript continua limpo (0 erros) — base saudável para os próximos planos

## Self-Check: PASSED

- `resources/js/Layouts/AppLayout.tsx` — FOUND (341 linhas, contém `setCreateOrgOpen`, `toSlug`, `organizations.store`, `rounded-[16px]`, `shadow-2xl`)
- Commit `7374267` — FOUND em git log
- `npx tsc --noEmit` — PASSED (0 erros, saída vazia)

---
*Phase: 08-multi-org-polish*
*Completed: 2026-04-24*
