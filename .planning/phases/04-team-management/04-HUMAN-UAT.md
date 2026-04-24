---
status: passed
phase: 04-team-management
source: [04-VERIFICATION.md]
started: 2026-04-23T00:00:00Z
updated: 2026-04-24T00:00:00Z
---

## Current Test

Verificação humana completa em 2026-04-24.

## Tests

### 1. Disparo de e-mail de convite
expected: Admin acessa /settings, preenche email+role no formulário de equipe, clica Convidar. Um email chega com link /invite/{token} clicável (GET, não POST).
result: passed

### 2. Página /invite/{token} no browser
expected: GET /invite/{token} válido renderiza página standalone (sem sidebar/AppLayout) com nome da org, badge de role, e formulário adequado (novo usuário: campos nome+senha; usuário existente: botão de confirmação). Token expirado mostra mensagem "Este convite expirou ou já foi utilizado."
result: passed

### 3. Upload de avatar com redimensionamento
expected: POST /settings/profile/avatar com imagem >256px redimensiona para 256×256 via Intervention Image, salva em storage/app/public/avatars/{id}.jpg, atualiza users.avatar, e o avatar aparece no header via UserAvatar.
result: fixed — `intervention/image ^3` e `intervention/image-laravel ^1` não estavam instalados no vendor (presentes em composer.json mas ausentes). Instalados via `composer require` em 2026-04-24. Upload funciona após instalação.

### 4. OrgSwitcher — troca de organização
expected: Header do AppLayout mostra UserAvatar(sm) + nome da org atual + ChevronDown. Clicar abre dropdown com lista de orgs. Selecionar outra org dispara PATCH /settings/current-org, atualiza current_organization_id, e recarrega a página no contexto da nova org.
result: passed

### 5. Restrições de colaborador na UI
expected: Usuário com role=collaborator não vê o formulário de convite na seção Equipe de /settings. Tentativa de POST /team/invite retorna 403. Botão de remoção de membros não aparece ou é desabilitado para collaborators.
result: passed

## Summary

total: 5
passed: 5
issues: 1 (fixed — missing composer packages)
pending: 0
skipped: 0
blocked: 0

## Gaps

- **Resolvido:** `intervention/image` e `intervention/image-laravel` ausentes do vendor. Corrigido com `composer require` em 2026-04-24.
