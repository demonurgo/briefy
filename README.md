# Briefy

B2B SaaS para agências de marketing — gerencie clientes, demandas e gere briefs acelerados por IA.

**License:** AGPL-3.0-or-later. See [LICENSE](./LICENSE).

**Stack:** PHP 8.4, Laravel 13, Inertia.js v3, React 19, TypeScript, PostgreSQL 17, Anthropic Claude API (BYOK), Laravel Reverb

---

## BYOK — Bring Your Own Key

Briefy é publicado como open source sob AGPL-3.0. Cada deploy fornece sua própria chave da API Anthropic por organização.

1. Crie sua conta em https://console.anthropic.com
2. Faça o deploy do Briefy (ou rode localmente)
3. Faça login como admin da organização
4. Acesse `/settings/ai`, cole sua chave `sk-ant-...`, clique em "Testar chave" e depois "Salvar"

Sem uma chave configurada, as funcionalidades de IA (geração de brief, chat, planejamento mensal, pesquisa de cliente) ficam desativadas graciosamente — a interface renderiza os botões mas exibe um tooltip orientando o usuário a configurar a chave.

As chaves são armazenadas criptografadas no banco de dados via `encrypted` cast do Laravel (AES-256-CBC via `APP_KEY`). Nunca são logadas, nunca retornadas pela API JSON, e apenas os últimos 4 caracteres são exibidos após salvar (`sk-ant-...XXXX`).

---

## Pré-requisitos

- PHP 8.4+
- Composer
- Node.js 20+
- PostgreSQL 17

---

## Setup inicial

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

---

## Rodar o projeto

```bash
# Terminal 1 — servidor PHP
php artisan serve

# Terminal 2 — assets frontend (Vite)
npm run dev
```

Acesse: http://localhost:8000

---

## PostgreSQL — Controle do serviço

O PostgreSQL roda como serviço do Windows. Para economizar RAM quando não estiver desenvolvendo:

**Parar o serviço:**
```powershell
net stop postgresql-x64-17
```

**Iniciar o serviço:**
```powershell
net start postgresql-x64-17
```

**Ver status:**
```powershell
Get-Service -Name "postgresql*"
```

> Para mudar para início manual (não iniciar automaticamente com o Windows):
> ```powershell
> Set-Service -Name "postgresql-x64-17" -StartupType Manual
> ```
> Depois disso, inicie manualmente antes de rodar o projeto com `net start postgresql-x64-17`.

---

## Testes

```bash
# Criar banco de testes (apenas na primeira vez)
psql -U postgres -c "CREATE DATABASE briefy_test;"

# Rodar todos os testes
php artisan test

# Rodar com verbose
php artisan test --verbose
```

---

## Banco de dados

```bash
# Rodar migrations
php artisan migrate

# Resetar banco (apaga tudo e recria)
php artisan migrate:fresh

# Ver status das migrations
php artisan migrate:status
```

---

## License

Copyright (c) 2026 Briefy contributors.

Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo sob os termos da GNU Affero General Public License conforme publicada pela Free Software Foundation, versão 3 ou (a seu critério) qualquer versão posterior. Veja [LICENSE](./LICENSE) para o texto completo.

A escolha AGPL-3.0 é deliberada: protege contra forks proprietários que rodam o software como serviço sem contribuir as melhorias de volta para a comunidade.
