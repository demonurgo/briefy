# Phase 10: Automated Test Coverage — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Garantir que todos os fluxos críticos do Briefy têm testes de feature que passam em `php artisan test` com zero falhas. O trabalho principal é escrever `DemandLifecycleTest.php` (TEST-03), que é o único gap real. Os demais requisitos (TEST-01, 02, 04, 05) já têm cobertura — validar que passam em ambiente configurado.

</domain>

<decisions>
## Implementation Decisions

### TEST-03: Demand Lifecycle (Gap Principal)

- **D-01:** Criar `tests/Feature/DemandLifecycleTest.php` — arquivo único seguindo o padrão do projeto.
- **D-02:** Cobrir happy path completo: create, status update, assign, archive, trash/restore.
- **D-03:** Usar `PUT /demands/{demand}/inline` (route `demands.inline.update`) para testes de assign — mesma rota usada no frontend e no `NotificationDeliveryTest`.
- **D-04:** Incluir casos de RBAC/autorização:
  - Cross-org 403: usuário de outra org não pode ver/editar demands
  - Unauthenticated redirect: sem login → redirect para /login
  - Collaborator não pode deletar demand de outros
- **D-05:** Profundidade: happy path + RBAC descrito acima. Sem edge cases de validação de campos individuais (fora do escopo desta fase).

### Tests Existentes (TEST-01, 02, 04, 05)

- **D-06:** Verificar e rodar — não modificar os tests existentes.
- **D-07:** Se algum test falhar por bug real (não problema de ambiente), corrigir o bug, não ignorar. Ambiente quebrado (DB não configurado) não conta como falha do test.
- **D-08:** Critério de sucesso: todos os tests existentes passam com zero falhas em ambiente configurado.

### Ambiente de Teste

- **D-09:** Manter PostgreSQL `briefy_test` — não migrar para SQLite. Fidelidade ao ambiente de produção.
- **D-10:** Documentar setup localmente (provavelmente em `README.md` ou `TESTING.md`): `createdb briefy_test` + `php artisan migrate --env=testing`.
- **D-11:** CI/CD (GitHub Actions com PostgreSQL service) é **deferido** — branch não está publicada ainda. Adicionar quando publicar.

### Claude's Discretion

- Ordem dos métodos dentro de `DemandLifecycleTest.php`: agrupar por ciclo de vida (create → update → status → assign → archive → trash)
- Factory setup: reusar `Organization::factory()`, `User::factory()`, `Client::factory()`, `Demand::factory()` já existentes — sem criar novos
- Usar `RefreshDatabase` + `actingAs()` seguindo o padrão de todos os tests existentes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Padrão de Tests Existentes (referências diretas)
- `tests/Feature/NotificationDeliveryTest.php` — Padrão de uso do `demands.inline.update` + `Event::fake()` + `assertDatabaseHas()`
- `tests/Feature/AiChatControllerTest.php` — Padrão de cross-org 403 e unauthenticated redirect
- `tests/Feature/InvitationControllerTest.php` — Padrão de RBAC (role-based assertions)
- `tests/Feature/Auth/AuthenticationTest.php` — Padrão de auth flow tests

### Controladores a Testar (TEST-03)
- `app/Http/Controllers/DemandController.php` — `store`, `updateStatus`, `updateInline`, `destroy`
- `app/Http/Controllers/TrashController.php` — `trash`, `restore`, `forceDelete`
- `app/Http/Controllers/ArchiveController.php` — `archive`, `unarchive`

### Factories Disponíveis
- `database/factories/DemandFactory.php`
- `database/factories/ClientFactory.php`
- `database/factories/OrganizationFactory.php`
- `database/factories/UserFactory.php`

### Configuração de Tests
- `phpunit.xml` — DB_CONNECTION=pgsql, DB_DATABASE=briefy_test
- `tests/TestCase.php` — Base class com `withoutVite()`

### Rotas Demand
- `routes/web.php` linhas 25-82 — todas as rotas de demand (resource + custom)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DemandFactory`: campo `organization_id`, `client_id`, `created_by`, `assigned_to`, `status` — usar diretamente
- `NotificationDeliveryTest`: já demonstra como fazer PATCH/PUT em demands + assert no DB — copiar padrão
- `EnsureRoleTest.php`: demonstra como testar RBAC com diferentes roles

### Established Patterns
- `use RefreshDatabase` em todos os feature tests — sempre incluir
- `$this->actingAs($user)->{method}(route(...), [...])` para autenticação
- `$this->assertDatabaseHas('demands', [...])` para verificar persistência
- `Event::fake([...])` quando precisar suprimir broadcast
- `->assertRedirect()` para confirmar redirect pós-action (não assertOk)

### Integration Points
- `DemandController::store` recebe `client_id` como route param: `POST /clients/{client}/demands`
- `DemandController::updateStatus` recebe: `PATCH /demands/{demand}/status` com `['status' => '...']`
- `TrashController::trash`: `POST /demands/{demand}/trash`
- `ArchiveController::archive`: `POST /demands/{demand}/archive`
- Roles do sistema: `owner`, `admin`, `member`, `collaborator` (pivot `organization_user`)

</code_context>

<specifics>
## Specific Ideas

- Para testar "collaborator não pode deletar": criar user com role `collaborator` na org, tentar `DELETE /clients/{client}/demands/{demand}`, esperar 403 ou redirect com erro
- Para cross-org 403: criar segundo usuário em org diferente, tentar acessar demand da primeira org
- O `EnsureRole` middleware é o guard de RBAC — os tests devem confirmar que ele bloqueia corretamente

</specifics>

<deferred>
## Deferred Ideas

- CI/CD (GitHub Actions com PostgreSQL service) — deferido até publicar a branch
- Edge cases de validação de campos (campo obrigatório faltando no store, titulo vazio) — não é escopo desta fase
- Tests para file upload/download em demands — não listado nos requisitos TEST-01 a TEST-05
- E2E browser tests (Playwright/Cypress) — explicitamente fora do escopo (REQUIREMENTS.md)

</deferred>

---

*Phase: 10-automated-test-coverage*
*Context gathered: 2026-04-24*
