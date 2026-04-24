# Phase 10: Automated Test Coverage — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 10-automated-test-coverage
**Areas discussed:** TEST-03 scope, Gaps nos tests existentes, Ambiente de teste, Organização dos arquivos

---

## TEST-03: Demand Lifecycle Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Happy path + RBAC | Create, status, assign, archive, trash/restore + cross-org 403, unauth redirect, collaborator não pode deletar | ✓ |
| Happy path somente | Só o fluxo principal, sem RBAC | |
| Cobertura total | Happy path + RBAC completo + edge cases de validação | |

**Escolha para rota de assign:**

| Option | Description | Selected |
|--------|-------------|----------|
| Inline update | PUT /demands/{id}/inline — padrão do frontend | ✓ |
| Update completo | PATCH clients/{client}/demands/{demand} — testa validator | |
| Ambas | Testar as duas rotas | |

**Casos de RBAC selecionados:**
- Cross-org 403 ✓
- Unauthenticated redirect ✓
- Collaborator não pode deletar ✓

---

## Gaps nos Tests Existentes

| Option | Description | Selected |
|--------|-------------|----------|
| Verificar e rodar, não modificar | Confirmar que passam, corrigir bugs reais se aparecerem | ✓ |
| Revisar e complementar | Adicionar casos de borda ausentes | |
| Só rodar a suíte | Executar e reportar, sem análise | |

**Notes:** TEST-01, 02, 04, 05 já têm cobertura adequada. Foco em rodar e confirmar.

---

## Ambiente de Teste

| Option | Description | Selected |
|--------|-------------|----------|
| Manter PostgreSQL, documentar setup | briefy_test + instruções de setup | ✓ |
| Migrar para SQLite :memory: | Mais rápido, sem setup externo, mas esconde diferenças | |
| Criar script de CI | Makefile ou bash para setup automático | |

**Validação:**

| Option | Description | Selected |
|--------|-------------|----------|
| Ambiente local configurado | Validar localmente | ✓ (implícito) |
| CI/CD (GitHub Actions) | Workflow automático | Deferido |

**Notes do usuário:** "Não precisamos criar CI/CD agora pois a branch ainda não está publicada, mas precisamos publicar em breve e fazer também o CI/CD no GitHub."

---

## Organização dos Arquivos

| Option | Description | Selected |
|--------|-------------|----------|
| Um arquivo: DemandLifecycleTest.php | tests/Feature/ — simples, padrão do projeto | ✓ |
| Dividir em 2 arquivos | DemandCrudTest + DemandStatusTest | |
| tests/Feature/Demands/ subdiretório | Mais organizado, quebra o padrão atual | |

**Nome escolhido:** `DemandLifecycleTest.php`

---

## Claude's Discretion

- Ordem dos métodos no arquivo
- Factory setup (reusar factories existentes)
- Padrão de imports e trait RefreshDatabase

## Deferred Ideas

- CI/CD GitHub Actions — quando a branch for publicada
- Edge cases de validação de campos individuais
- Tests para file upload em demands
- E2E browser tests (Playwright/Cypress)
