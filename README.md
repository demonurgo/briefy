# Briefy

**B2B SaaS for marketing agencies.** Manage clients, track content demands, generate AI-assisted briefs, and collaborate in real time — all in one place.

**License:** AGPL-3.0-or-later · **Stack:** Laravel 13 · React 19 · Inertia.js · TypeScript · PostgreSQL · Anthropic Claude (BYOK) · Laravel Reverb

---

## Features

- **Client management** — client profiles, contact info, important dates, and per-client monthly post quota
- **Demand board** — Kanban + list view for content demands with drag-and-drop status transitions
- **AI brief generation** — Claude generates structured content briefs from demand context; inline editing supported
- **AI chat per demand** — multi-turn conversation per demand with full history and conversation picker
- **Monthly planning** — AI generates a full monthly content calendar per client; suggestions can be individually accepted, rejected, or bulk-converted into demands
- **Real-time collaboration** — live Kanban status updates and live comments via WebSocket (Laravel Reverb)
- **In-app notifications** — bell dropdown with real-time badge updates; mark individual or all as read
- **Team management** — invite members by email, role-based access (owner / admin / collaborator), multi-org support
- **BYOK** — each organization provides its own Anthropic API key; stored AES-256-CBC encrypted, never logged or returned in API responses
- **Themes** — light / dark mode per user preference
- **i18n** — pt-BR and English

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | PHP 8.4, Laravel 13 |
| Frontend | React 19, TypeScript, Inertia.js v3, Tailwind CSS v4 |
| Database | PostgreSQL 17 |
| Real-time | Laravel Reverb (WebSocket) |
| AI | Anthropic Claude API (claude-opus-4-7 / claude-sonnet-4-6) |
| Queue | Laravel sync (local) / configurable for Redis |
| Auth | Laravel Breeze |

---

## Requirements

- PHP 8.4+
- Composer
- Node.js 20+
- PostgreSQL 17

---

## Local Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/demonurgo/briefy.git
cd briefy
composer install
npm install

# 2. Environment
cp .env.example .env
php artisan key:generate

# 3. Database — create and migrate
createdb briefy
php artisan migrate

# 4. Start the dev servers
php artisan serve          # Terminal 1 — PHP server at http://localhost:8000
npm run dev                # Terminal 2 — Vite (frontend assets)
```

Open [http://localhost:8000](http://localhost:8000) and register your first account.

### Real-time (optional)

To enable live Kanban updates and live comments, start the Reverb WebSocket server:

```bash
php artisan reverb:start   # Terminal 3
```

---

## BYOK — Bring Your Own Anthropic Key

AI features (brief generation, chat, monthly planning, client research) are disabled by default until an Anthropic API key is configured per organization.

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Log in to Briefy as an org admin
3. Go to **Settings → AI**, paste your `sk-ant-...` key, click **Test key**, then **Save**

Without a key, AI buttons remain visible but show a tooltip directing the user to configure one. Keys are stored encrypted (AES-256-CBC via `APP_KEY`) and only the last 4 characters are displayed after saving.

---

## Running Tests

```bash
# Create the test database (first time only)
createdb briefy_test
php artisan migrate --env=testing

# Run the full suite (146 tests)
php artisan test

# Run a specific class
php artisan test --filter=DemandLifecycleTest
php artisan test --filter=NotificationDeliveryTest
```

See [TESTING.md](./TESTING.md) for the full environment setup and coverage map.

---

## Database

```bash
php artisan migrate           # Run pending migrations
php artisan migrate:fresh     # Drop all tables and re-migrate
php artisan migrate:status    # Show migration status
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes following the existing commit style
4. Run `php artisan test` — all tests must pass
5. Open a pull request

---

## License

Copyright (c) 2026 Briefy contributors.

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. See [LICENSE](./LICENSE) for the full text.

The AGPL-3.0 license is a deliberate choice: it prevents proprietary forks from running this software as a service without contributing improvements back to the community.
