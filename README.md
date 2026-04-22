# Briefy

SaaS para agências de marketing e freelancers gerenciarem demandas com clientes, com IA integrada via Claude.

**Stack:** PHP 8.4, Laravel 13, Inertia.js v3, React 19, TypeScript, PostgreSQL 17, Prism PHP, Laravel Reverb

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
