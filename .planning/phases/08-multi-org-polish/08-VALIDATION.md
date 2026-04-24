---
phase: 8
slug: multi-org-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest PHP (Laravel) + `npx tsc --noEmit` (TypeScript gate) |
| **Config file** | `phpunit.xml` / `vite.config.ts` |
| **Quick run command** | `php artisan test --filter OrganizationCreationTest` |
| **Full suite command** | `php artisan test && npx tsc --noEmit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `php artisan test --filter OrganizationCreationTest` (MORG-01 tasks) or `npx tsc --noEmit` (POLISH-02 tasks)
- **After every plan wave:** Run `php artisan test && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-xx-01 | MORG-01 | 1 | MORG-01 | — | Only authenticated users can create orgs | Feature (PHP) | `php artisan test --filter OrganizationCreationTest` | ❌ W0 | ⬜ pending |
| 8-xx-02 | MORG-01 | 1 | MORG-01 | — | Slug uniqueness validation enforced | Feature (PHP) | `php artisan test --filter OrganizationCreationTest` | ❌ W0 | ⬜ pending |
| 8-xx-03 | MORG-01 | 1 | MORG-01 | — | Creator auto-switched to new org on success | Feature (PHP) | `php artisan test --filter OrganizationCreationTest` | ❌ W0 | ⬜ pending |
| 8-xx-04 | POLISH-01 | 2 | POLISH-01 | — | GET SSE branch uses EventSource (not fetch) | Manual | `npx vite build` (no TS errors) | ❌ W0 | ⬜ pending |
| 8-xx-05 | POLISH-02 | 1 | POLISH-02 | — | tsc --noEmit exits 0 after type fixes | Type check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 8-xx-06 | POLISH-03 | 2 | POLISH-03 | — | Conversation picker renders all conversations | Manual | — | manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/OrganizationCreationTest.php` — stubs for MORG-01 (store, pivot attach, auto-switch)
- [ ] `npx tsc --noEmit` baseline captured before POLISH-02 work (15 errors expected)

*TypeScript gate (`npx tsc --noEmit`) always available — no Wave 0 install needed. PHP backend test file requires Wave 0 stub.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OrgSwitcher shows new org immediately after creation | MORG-01 | Requires browser + Inertia partial reload verification | Log in → OrgSwitcher → + Criar organização → fill name → Criar → verify new org in dropdown |
| Conversation picker dropdown renders and switches conv | POLISH-03 | Pure UI state change; no HTTP request | Open demand with 2+ conversations → click picker → select older conv → verify chat goes read-only |
| useAiStream GET branch streams research timeline events | POLISH-01 | EventSource behavior requires browser network tab | Open client research modal → verify events appear without JS EventSource errors in console |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
