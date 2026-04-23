---
status: partial
phase: 04-team-management
source: [04-VERIFICATION.md]
started: 2026-04-23T00:00:00Z
updated: 2026-04-23T00:00:00Z
---

## Current Test

[aguardando verificação humana]

## Tests

### 1. Disparo de e-mail de convite
expected: Admin acessa /settings, preenche email+role no formulário de equipe, clica Convidar. Um email chega com link /invite/{token} clicável (GET, não POST).
result: [pending]

### 2. Página /invite/{token} no browser
expected: GET /invite/{token} válido renderiza página standalone (sem sidebar/AppLayout) com nome da org, badge de role, e formulário adequado (novo usuário: campos nome+senha; usuário existente: botão de confirmação). Token expirado mostra mensagem "Este convite expirou ou já foi utilizado."
result: [pending]

### 3. Upload de avatar com redimensionamento
expected: POST /settings/profile/avatar com imagem >256px redimensiona para 256×256 via Intervention Image, salva em storage/app/public/avatars/{id}.jpg, atualiza users.avatar, e o avatar aparece no header via UserAvatar.
result: [pending]

### 4. OrgSwitcher — troca de organização
expected: Header do AppLayout mostra UserAvatar(sm) + nome da org atual + ChevronDown. Clicar abre dropdown com lista de orgs. Selecionar outra org dispara PATCH /settings/current-org, atualiza current_organization_id, e recarrega a página no contexto da nova org.
result: [pending]

### 5. Restrições de colaborador na UI
expected: Usuário com role=collaborator não vê o formulário de convite na seção Equipe de /settings. Tentativa de POST /team/invite retorna 403. Botão de remoção de membros não aparece ou é desabilitado para collaborators.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
