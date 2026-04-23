# Phase 4: Team Management - Research

**Researched:** 2026-04-23
**Domain:** Laravel multi-org pivot, invitation tokens, role authorization, avatar upload, settings reorganization
**Confidence:** HIGH (all major claims verified against live codebase + official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Invitations**
- D-01: Tabela `invitations` com: `id`, `organization_id`, `invited_by`, `email`, `role`, `token` (uuid), `accepted_at`, `expires_at` (7 dias), `timestamps`
- D-02: Fluxo: admin digita email + role → cria registro → email com `/invite/{token}` → aceite → define nome+senha (ou confirma se já tem conta) → entra na org
- D-03: Email já tem conta em outra org → convite válido, usuário passa a pertencer a ambas
- D-04: Email sem conta → criar User + associar no aceite
- D-05: Admin pode cancelar convite antes do aceite (delete do registro)

**Multi-org**
- D-06: Pivot `organization_user` com: `user_id`, `organization_id`, `role`, `joined_at`
- D-07: `users.organization_id` renomeado para `users.current_organization_id`
- D-08: Migration cria pivot, popula de `users.organization_id` existente, renomeia coluna
- D-09: Controllers passam a usar `auth()->user()->currentOrganization()` — sem quebrar `organization_id` em demands/clients
- D-10: Switcher: `PATCH /settings/current-org` → atualiza `current_organization_id` → Inertia reload

**Roles**
- D-11: Enum expandido: `owner | admin | collaborator`
- D-12: Owner = criador da org (setado no register), não pode ser removido/rebaixado
- D-13: Admin = gerencia equipe, clientes, settings, dashboard completo
- D-14: Collaborator = NÃO pode convidar/remover membros, editar/deletar clientes, acessar Settings/IA, ver dashboard completo, deletar demandas de outros
- D-15: `User::isOwner()` e `User::isAdminOrOwner()` helper methods no Model
- D-16: Middleware `EnsureRole` ou policy gates para rotas sensíveis

**Avatar**
- D-17: `storage/app/public/avatars/users/{user_id}.{ext}` via `Storage::disk('public')`
- D-18: Campo `avatar` (string nullable) na tabela `users`
- D-19: Fallback: gradiente 2 cores HSL de hash do nome + iniciais em branco
- D-20: `UserAvatar` novo componente, mesma API de `ClientAvatar` (`name`, `avatar`, `size`)
- D-21: 2MB máx, jpg/png/webp, redimensiona para 256x256 no backend

**Settings**
- D-22: Rota única `/settings` com 4 seções: `#profile`, `#organization`, `#team`, `#ai`
- D-23: Seção Perfil: avatar, nome, email (readonly), alterar senha
- D-24: Seção Organização: nome + logo da org. Visível a todos, editável só por admin/owner
- D-25: Seção Equipe: roster + form convite + ações. Visível a todos, ações restritas
- D-26: Seção IA: absorve `/settings/ai` integralmente; `/settings/ai` redireciona para `/settings#ai`
- D-27: Sub-nav sticky com scroll-spy; mobile: select dropdown

### Claude's Discretion

- Algoritmo exato de geração das 2 cores do gradiente (hashing do nome → HSL)
- CSS exato do gradiente no `UserAvatar` (ângulo, tamanhos)
- Email template do convite (texto, layout)
- Estratégia de cache do `organization_user` pivot (eager loading vs cache tag)
- Redimensionamento: Intervention Image vs GD nativo do PHP
- Animação do switcher de org no header

### Deferred Ideas (OUT OF SCOPE)

- Multi-org switcher com workspaces nomeados por contexto
- SSO / login social para aceitar convites
- Convite em massa (CSV)
- Limite de membros por plano
- Permissões granulares por cliente
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEAM-01 | Admin can invite user by email; invited user receives link and joins as member | Invitation flow via `invitations` table + Notification/Mailable; `resend/resend-laravel` already installed |
| TEAM-02 | Admin can view all org members in team roster (name, avatar, role, join date) | `organization_user` pivot with `withPivot('role','joined_at')`; data available after migration |
| TEAM-03 | Admin can change member role or remove them from org | PATCH/DELETE on `organization_user` pivot; guarded by `isAdminOrOwner()` gate |
| TEAM-04 | Any user can edit own profile: name, avatar, locale, theme | `PATCH /settings/profile`; avatar via `Storage::disk('public')` + Intervention Image cover(256,256) |
| TEAM-05 | Role-based access enforced: only admins/owners can invite, remove, delete others' content | `EnsureRole` middleware + Gate defines in `AppServiceProvider::boot()`; `before()` hook for owner shortcircuit |
| TEAM-06 | Settings page organized into sections: Profile, Organization, Team, AI Key | Single `/settings` page with anchor sections; `/settings/ai` 301 redirect to `/settings#ai` |
</phase_requirements>

---

## Summary

Phase 4 is primarily a **data-model refactor + feature layer** on top of existing user/organization infrastructure. The codebase already has `organization_id` on the `users` table (and many eager references to `$user->organization_id` scattered across ~12 files); the migration plan must rename that column to `current_organization_id`, create the `organization_user` pivot, and update every reference without breaking the existing `clients.organization_id` and `demands.organization_id` foreign keys.

The invitation system is relatively simple: a `invitations` table with a UUID token, a guest-accessible `GET /invite/{token}` page, and an `AcceptInvitationController` that handles both "existing user" and "new user" paths. Email delivery uses `resend/resend-laravel` which is already in `composer.json`; the MAIL_MAILER just needs to be set to `resend` in `.env`.

Avatar upload uses `intervention/image` ^3 (not yet in `composer.json`) with the GD driver (GD is confirmed available on this machine). The backend resizes to exactly 256x256 using `cover()` and writes to `storage/app/public/avatars/users/{user_id}.{ext}`. The `UserAvatar` React component mirrors `ClientAvatar` but adds deterministic 2-color HSL gradient as fallback.

**Primary recommendation:** Execute in this order: (1) schema migration wave, (2) backfill `organization_user` pivot + rename column, (3) update all 39+ `$user->organization_id` references, (4) invitation system, (5) role gates + EnsureRole middleware, (6) avatar upload, (7) Settings page consolidation, (8) UserAvatar component + AppLayout header wiring.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Invitation creation & token storage | API / Backend | — | Security-sensitive; DB write must be server-side |
| Invitation email delivery | API / Backend | — | Mail::to() called from controller; Resend handles delivery |
| Invitation acceptance (new user) | API / Backend | Browser | Form submission creates User record, logs in |
| Invitation acceptance (existing user) | API / Backend | Browser | Validates token, attaches user to org pivot |
| Org context switching | API / Backend | Browser | PATCH updates `current_organization_id`; Inertia reload delivers new props |
| Role enforcement | API / Backend | Browser (UI hide) | Backend must abort(403); frontend hides UI elements |
| Avatar upload & resize | API / Backend | — | File stored server-side; resize via Intervention Image |
| UserAvatar gradient generation | Browser / Client | — | Pure CSS + JS hash; no server involvement |
| Settings page layout | Browser / Client | — | Single-page with anchor scroll-spy |
| Team roster display | API / Backend | Browser | Data from pivot, rendered by React |

---

## Runtime State Inventory

> This phase renames `users.organization_id` to `users.current_organization_id`. Full runtime state audit follows.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `users.organization_id` column in PostgreSQL `briefy` DB — every existing user row has this set | Migration: rename column via `Schema::table` `->renameColumn('organization_id', 'current_organization_id')` + backfill `organization_user` pivot from existing values |
| Stored data | `organization_user` pivot table does not yet exist | Migration: create table, populate from `users.organization_id` before rename |
| Stored data | `users.role` enum currently `admin|collaborator` — existing users have one of these two values | Migration: `ALTER COLUMN role TYPE VARCHAR(50)` then add `owner`; existing `admin` rows for org founders should become `owner` or stay `admin` (see Open Questions) |
| Live service config | No external service config stores `organization_id`; all in PostgreSQL via Eloquent | Code edits only |
| OS-registered state | None — no Task Scheduler or pm2 tasks reference organization fields | None |
| Secrets/env vars | No env vars reference `organization_id` | None |
| Build artifacts | `vendor/` does not include anything that references `users.organization_id` at runtime | None — `php artisan migrate` clears schema cache |

**Code references requiring update after rename (39 occurrences across 12 files):**
- `app/Http/Middleware/HandleInertiaRequests.php` (2 refs: `$user->organization_id`)
- `app/Http/Middleware/AiUsageMeter.php` (2 refs)
- `app/Http/Controllers/AiBriefController.php` (1 ref)
- `app/Http/Controllers/TrashController.php` (4 refs)
- `app/Http/Controllers/ClientResearchController.php` (1 ref)
- `app/Http/Controllers/ClientController.php` (3 refs)
- `app/Http/Controllers/MonthlyPlanningController.php` (10 refs)
- `app/Http/Controllers/DemandController.php` (8 refs — includes `User::where('organization_id',...)`)
- `app/Http/Controllers/DashboardController.php` (1 ref)
- `app/Http/Controllers/ArchiveController.php` (3 refs)
- `app/Http/Controllers/AiChatController.php` (3 refs)
- `app/Http/Controllers/ClientAiMemoryController.php` (1 ref)

**Important distinction:** `clients.organization_id` and `demands.organization_id` are separate columns on separate tables — these do NOT change. The rename is only on the `users` table.

`User::where('organization_id', $orgId)` queries (5 occurrences) must become pivot-based: `Organization::find($orgId)->users` or `$org->users()->wherePivot(...)`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| intervention/image | ^3.11.7 (latest stable) [VERIFIED: Packagist] | Avatar resize to 256x256 | GD driver available on this machine; cover(256,256) gives exact crop |
| intervention/image-laravel | ^1.x | Service provider + Facade for Laravel | Auto-registration, publishable config |
| PHP GD extension | Built-in (confirmed present on this machine) | Image processing driver | Imagick not installed; GD is confirmed |
| resend/resend-laravel | v1.3.2 (already installed) [VERIFIED: composer.json] | Invitation email delivery | Already in project; set MAIL_MAILER=resend |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Str::uuid() (Laravel built-in) | — | Generate invitation token | Standard approach; no extra dependency |
| Gate::define / Policy (Laravel built-in) | — | Role authorization | Already available; no extra package needed |
| headlessui/react Transition | 2.2.10 (already in package.json) | Org switcher animation | Already used in `Dropdown.tsx` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| intervention/image v3 | PHP GD directly | Intervention is 3 lines vs 20 lines for resize+crop; worth the install |
| intervention/image v3 | spatie/image | Spatie wraps Imagick primarily; GD not available on this machine |
| Gate::define | Spatie Laravel Permission | Overkill for 3 roles; Spatie adds DB table overhead; Gates are simpler |
| Resend (already installed) | Mailgun / Postmark | Already installed; no reason to add another dependency |

**Installation:**
```bash
composer require intervention/image:^3 intervention/image-laravel:^1
php artisan vendor:publish --provider="Intervention\Image\Laravel\ServiceProvider"
php artisan storage:link  # if not already run
```

**Version verification (performed 2026-04-23):**
- `intervention/image` latest stable: 3.11.7 [VERIFIED: `composer show --available`]
- `resend/resend-laravel` installed: v1.3.2 [VERIFIED: composer.json]
- `@headlessui/react` installed: 2.2.10 [VERIFIED: package.json]

---

## Architecture Patterns

### System Architecture Diagram

```
Admin clicks "Invite"
       │
       ▼
POST /settings/team/invite
       │
       ├─ Validate email + role
       ├─ Create invitations row (token=Str::uuid(), expires_at=+7d)
       │
       ▼
InvitationMail → Resend → Invitee inbox
       │
       ▼
GET /invite/{token}  ← guest-accessible route
       │
       ├─ Token valid + not expired + not accepted?
       │     YES ──► InviteAcceptPage (Inertia, shows org name + role)
       │     NO  ──► error page ("link expired")
       │
       ▼
POST /invite/{token}/accept
       │
       ├─ User exists? ──► attach to organization_user pivot → login
       └─ User new?   ──► create User → attach to pivot → login
       │
       ▼
Redirect to /dashboard (now inside the invited org)

─────────────────────────────────────────────────────

Auth user accesses any page
       │
       ▼
HandleInertiaRequests::share()
       │
       ├─ auth.user.current_organization_id  → currentOrganization relation
       ├─ auth.user.organizations  → $user->organizations (via pivot)
       └─ auth.user.role  → from organization_user pivot for current org

─────────────────────────────────────────────────────

User clicks org in switcher dropdown
       │
       ▼
PATCH /settings/current-org  { organization_id: X }
       │
       ├─ Verify user belongs to org X (pivot check)
       ├─ $user->update(['current_organization_id' => X])
       └─ return Inertia::location(back) or back()
       │
       ▼
All subsequent requests use new current_organization_id

─────────────────────────────────────────────────────

Avatar upload
       │
       ▼
POST /settings/profile (multipart form)
       │
       ├─ Validate: max:2048, mimes:jpg,png,webp
       ├─ $manager->read($file)->cover(256,256)->toJpeg(90)
       ├─ Storage::disk('public')->put("avatars/users/{$user->id}.jpg", $image)
       └─ $user->update(['avatar' => "avatars/users/{$user->id}.jpg"])
       │
       ▼
UserAvatar component reads /storage/avatars/users/{id}.jpg
```

### Recommended Project Structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Settings/
│   │   │   ├── SettingsController.php    # GET /settings (unified page)
│   │   │   ├── ProfileController.php     # PATCH /settings/profile
│   │   │   └── OrganizationController.php # PATCH /settings/organization
│   │   ├── InvitationController.php      # GET+POST /invite/{token}
│   │   └── TeamController.php            # index, invite, updateRole, remove
│   └── Middleware/
│       └── EnsureRole.php               # NEW: abort(403) if role insufficient
├── Mail/
│   └── InvitationMail.php               # NEW: invitation email (Markdown)
├── Models/
│   ├── Invitation.php                   # NEW
│   └── OrganizationUser.php             # NEW (Pivot model, optional)
database/
├── migrations/
│   ├── 2026_04_23_XXXXXX_create_organization_user_table.php
│   ├── 2026_04_23_XXXXXX_create_invitations_table.php
│   ├── 2026_04_23_XXXXXX_rename_organization_id_on_users.php
│   ├── 2026_04_23_XXXXXX_add_avatar_to_users_table.php
│   └── 2026_04_23_XXXXXX_expand_role_enum_on_users_table.php
resources/js/
├── Components/
│   └── UserAvatar.tsx                   # NEW (mirrors ClientAvatar + gradient)
├── pages/
│   └── Settings/
│       └── Index.tsx                    # REPLACE stub: unified 4-section page
│   └── Invite/
│       └── Accept.tsx                   # NEW: invitation acceptance page
```

### Pattern 1: Multi-org belongsToMany with Pivot Data

**What:** Users belong to many organizations; each membership has role + joined_at on the pivot.
**When to use:** Any query about "which users are in this org" or "what role does this user have in this org".

```php
// Source: https://laravel.com/docs/12.x/eloquent-relationships#many-to-many

// In User.php
public function organizations(): BelongsToMany
{
    return $this->belongsToMany(Organization::class, 'organization_user')
        ->withPivot('role', 'joined_at')
        ->withTimestamps();
}

public function currentOrganization(): BelongsTo
{
    return $this->belongsTo(Organization::class, 'current_organization_id');
}

// In Organization.php  
public function users(): BelongsToMany
{
    return $this->belongsToMany(User::class, 'organization_user')
        ->withPivot('role', 'joined_at')
        ->withTimestamps();
}
```

**Accessing pivot role for current org:**
```php
$orgId = $user->current_organization_id;
$membership = $user->organizations()->wherePivot('organization_id', $orgId)->first();
$role = $membership?->pivot->role;
```

**Or use a helper accessor on User:**
```php
// In User.php — convenience for current org role
public function getCurrentRoleAttribute(): ?string
{
    return $this->organizations()
        ->wherePivot('organization_id', $this->current_organization_id)
        ->first()?->pivot->role;
}

public function isOwner(): bool
{
    return $this->getCurrentRoleAttribute() === 'owner';
}

public function isAdminOrOwner(): bool
{
    return in_array($this->getCurrentRoleAttribute(), ['owner', 'admin']);
}
```

### Pattern 2: Invitation Token Flow

**What:** UUID token in `invitations` table; guest-accessible accept route handles both new and returning users.
**When to use:** Any invite-based onboarding where recipient may or may not have an account.

```php
// InvitationController — accept flow
public function accept(Request $request, string $token): Response|RedirectResponse
{
    $invitation = Invitation::where('token', $token)
        ->whereNull('accepted_at')
        ->where('expires_at', '>', now())
        ->firstOrFail();

    $existingUser = User::where('email', $invitation->email)->first();

    return Inertia::render('Invite/Accept', [
        'invitation' => $invitation->only(['email', 'role']),
        'organization' => $invitation->organization->only(['name']),
        'has_account' => (bool) $existingUser,
    ]);
}

public function store(Request $request, string $token): RedirectResponse
{
    $invitation = Invitation::where('token', $token)
        ->whereNull('accepted_at')
        ->where('expires_at', '>', now())
        ->firstOrFail();

    $existingUser = User::where('email', $invitation->email)->first();

    if ($existingUser) {
        // Attach to pivot if not already member
        $existingUser->organizations()->syncWithoutDetaching([
            $invitation->organization_id => [
                'role' => $invitation->role,
                'joined_at' => now(),
            ]
        ]);
        Auth::login($existingUser);
    } else {
        $request->validate([
            'name' => 'required|string|max:255',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);
        $user = User::create([
            'name' => $request->name,
            'email' => $invitation->email,
            'password' => Hash::make($request->password),
            'current_organization_id' => $invitation->organization_id,
            'role' => $invitation->role,  // keep on users table for backward compat during transition
        ]);
        $user->organizations()->attach($invitation->organization_id, [
            'role' => $invitation->role,
            'joined_at' => now(),
        ]);
        Auth::login($user);
    }

    $invitation->update(['accepted_at' => now()]);

    return redirect()->route('dashboard');
}
```

### Pattern 3: EnsureRole Middleware

**What:** Middleware that checks if `$user->isAdminOrOwner()` (or specific role) and aborts 403 if not.
**When to use:** Routes that only admins/owners may access.

```php
// app/Http/Middleware/EnsureRole.php
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $currentRole = $user?->getCurrentRoleAttribute();
        
        if (! $user || ! in_array($currentRole, $roles)) {
            abort(403, 'Insufficient permissions.');
        }
        
        return $next($request);
    }
}

// Usage in routes:
Route::post('/settings/team/invite', ...)->middleware('role:admin,owner');
Route::delete('/settings/team/{user}', ...)->middleware('role:admin,owner');
```

### Pattern 4: Avatar Upload with Intervention Image v3

**What:** Validate upload → resize to 256x256 via `cover()` → write to public disk → update user record.
**When to use:** Any user-facing avatar/logo upload.

```php
// Source: https://image.intervention.io/v3/modifying-images/resizing + Laravel Storage docs
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\Storage;

public function updateAvatar(Request $request): RedirectResponse
{
    $request->validate([
        'avatar' => ['required', 'image', 'max:2048', 'mimes:jpeg,png,webp'],
    ]);

    $manager = new ImageManager(Driver::class);
    $image = $manager->read($request->file('avatar'))
        ->cover(256, 256)
        ->toJpeg(quality: 90);

    $path = "avatars/users/{$request->user()->id}.jpg";
    Storage::disk('public')->put($path, (string) $image);

    $request->user()->update(['avatar' => $path]);

    return back()->with('success', 'Avatar atualizado.');
}
```

### Pattern 5: UserAvatar Deterministic Gradient (TypeScript)

**What:** Hash name string to derive two HSL hue values spaced ~120° apart for gradient.
**When to use:** Any user without an uploaded avatar.

```typescript
// Claude's discretion — algorithm recommended based on ClientAvatar pattern + D-19 spec
function nameToGradient(name: string): { from: string; to: string } {
  // Simple djb2-style hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue1 = hash % 360;
  const hue2 = (hue1 + 130) % 360;  // ~130° spacing for contrast
  return {
    from: `hsl(${hue1}, 65%, 52%)`,
    to:   `hsl(${hue2}, 65%, 42%)`,
  };
}

// Usage in UserAvatar component
const { from, to } = nameToGradient(name);
const style = { background: `linear-gradient(135deg, ${from}, ${to})` };
```

### Anti-Patterns to Avoid

- **Querying `User::where('organization_id', $orgId)`** after migration: this column no longer exists on users table post-rename. Use `Organization::find($orgId)->users` or `$org->users()` (pivot relation) instead.
- **Storing role in `users.role` as the canonical truth** after pivot creation: `users.role` becomes vestigial; the canonical role for any given context is `organization_user.role`. Keep `users.role` in sync during this phase to avoid breaking existing tests, but new code reads from pivot.
- **Not invalidating existing user sessions** after role change: if an admin downgrades a collaborator, the user's next Inertia request must re-read role from pivot. Since role is shared via HandleInertiaRequests on every request, this is automatic — no special handling needed.
- **Passing the full `invitations` record to the frontend** (contains `invited_by`, internal IDs): only expose `email`, `role`, and org name to the accept page.
- **Using `$request->file('avatar')->store()`** without resizing: stores original at full size. Always resize to 256x256 before storing.
- **Not deleting old avatar** before storing new one: `Storage::disk('public')->delete($oldPath)` before write to avoid orphaned files.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resize/crop to exact 256x256 | Custom GD wrapper with imagecopyresampled | `intervention/image` `->cover(256,256)` | GD edge cases (aspect ratio, EXIF orientation) are handled by Intervention |
| UUID token generation | `rand()` or `md5(time())` | `(string) Str::uuid()` (Laravel built-in) | Cryptographically random, RFC 4122 compliant |
| Email templating | Inline HTML string in controller | `InvitationMail` Mailable with Blade markdown template | Separation of concerns; testable with `Mail::fake()` |
| Role checking inline | `if ($user->role === 'admin' || ...)` scattered everywhere | `$user->isAdminOrOwner()` + `EnsureRole` middleware | Centralizes logic; easy to change |
| Pivot table sync | Manual INSERT/UPDATE on `organization_user` | `$user->organizations()->syncWithoutDetaching(...)` | Handles duplicates, only inserts missing rows |
| Many-to-many attachment | Raw SQL | `->attach($orgId, ['role' => ..., 'joined_at' => now()])` | Eloquent handles binding automatically |

**Key insight:** The multi-org pivot relationship is standard Eloquent `belongsToMany` — there is no custom complexity. The only real complexity is the **migration** that backfills the pivot from existing `users.organization_id` data without data loss.

---

## Common Pitfalls

### Pitfall 1: Column Rename Breaks Existing Tests

**What goes wrong:** `RegistrationTest` asserts `$user->organization_id` exists. After migration, this column becomes `current_organization_id` — existing test fails.
**Why it happens:** Test reads column by old name; factory still sets `organization_id`.
**How to avoid:** In the same migration wave as the rename, update `UserFactory` to use `current_organization_id`. Update `RegistrationTest` to assert the new column name. Run full test suite after migration wave before proceeding.
**Warning signs:** `RegistrationTest::test_new_users_can_register_and_organization_is_created` fails with `Undefined property: organization_id`.

### Pitfall 2: `User::where('organization_id', ...)` Queries After Rename

**What goes wrong:** `DemandController` and `MonthlyPlanningController` do `User::where('organization_id', $orgId)` to fetch team members. After rename, `organization_id` no longer exists on `users` table → SQL error.
**Why it happens:** These are direct column queries against the old `users.organization_id`, not the `organization_user` pivot.
**How to avoid:** Replace with `$org->users()->get(['id', 'name'])` using the new pivot relation. Must happen in the same plan as the migration.
**Warning signs:** `SQLSTATE[42703]: column "organization_id" does not exist` on demand or planning pages.

### Pitfall 3: Pivot Role vs `users.role` Dual Source of Truth

**What goes wrong:** `HandleInertiaRequests` currently shares `auth.user.role` from `$user->role` (direct column). After Phase 4, the canonical role is in `organization_user.role`. If not updated, the frontend sees stale role.
**Why it happens:** `users.role` is kept for backward compatibility but becomes secondary.
**How to avoid:** In `HandleInertiaRequests::share()`, replace `'role' => $user->role` with `'role' => $user->getCurrentRoleAttribute()` which reads from the pivot for the current org.
**Warning signs:** Admin UI actions visible to collaborators; role badge shows wrong value.

### Pitfall 4: Invitation Token Not Validated for Org Membership

**What goes wrong:** A user with an account accepts an invite to Org B, but the accept controller uses `Auth::login($user)` without setting `current_organization_id` to Org B — user lands in Org A.
**Why it happens:** Forget to `update(['current_organization_id' => $invitation->organization_id])` before login.
**How to avoid:** After `syncWithoutDetaching()`, always: `$existingUser->update(['current_organization_id' => $invitation->organization_id])`.
**Warning signs:** User lands on dashboard and sees Org A's data after accepting Org B's invite.

### Pitfall 5: Storage Symlink Not Created

**What goes wrong:** Avatar URLs (`/storage/avatars/users/1.jpg`) return 404.
**Why it happens:** `php artisan storage:link` not run; `public/storage` symlink missing.
**How to avoid:** Include `php artisan storage:link` in the Wave 0 plan (run once per environment). Verify symlink exists at `public/storage → ../storage/app/public`.
**Warning signs:** All avatar img tags show broken images; `Storage::url()` returns correct path but file inaccessible.

### Pitfall 6: Role Enum Migration on PostgreSQL

**What goes wrong:** PostgreSQL ENUM types cannot be modified with a simple `->change()`; you must drop and recreate the column or use a VARCHAR.
**Why it happens:** PostgreSQL treats ENUM as a named type. Laravel's `enum()` migration creates a PostgreSQL `CHECK` constraint (not a TYPE), so `->change()` with new values works via `alterColumn`. However, current migration uses `->enum('role', [...])` which in Laravel + PostgreSQL uses a CHECK constraint, so adding `owner` requires updating the constraint.
**How to avoid:** Use `->string('role')->default('admin')` with application-level validation, OR use a dedicated ALTER migration that drops and re-adds the CHECK constraint. Verify with `php artisan migrate` in a test environment first.
**Warning signs:** `psql: ERROR: invalid input value for enum` or migration fails on the enum change.

### Pitfall 7: Intervention Image v3 vs v4 API

**What goes wrong:** Composer might resolve `intervention/image:^4` (released 2026) which has a different API. v4 changes the namespace and `cover()` method signature.
**Why it happens:** `^3` constraint in `composer.json` prevents this, but v4.0.1 exists.
**How to avoid:** Pin to `^3` explicitly in `composer.json`. The research confirmed v3.11.7 is the latest v3; use `composer require intervention/image:^3 intervention/image-laravel:^1`.
**Warning signs:** Class `Intervention\Image\ImageManager` not found (v4 uses different namespace).

---

## Code Examples

### Migration: Create pivot + backfill + rename column

```php
// Source: [ASSUMED] — standard Laravel migration pattern for data-safe column rename
public function up(): void
{
    // Step 1: Create organization_user pivot
    Schema::create('organization_user', function (Blueprint $table) {
        $table->foreignId('user_id')->constrained()->cascadeOnDelete();
        $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
        $table->string('role')->default('collaborator');
        $table->timestamp('joined_at')->nullable();
        $table->timestamps();
        $table->primary(['user_id', 'organization_id']);
    });

    // Step 2: Backfill from existing users.organization_id
    DB::statement("
        INSERT INTO organization_user (user_id, organization_id, role, joined_at, created_at, updated_at)
        SELECT id, organization_id, role, created_at, NOW(), NOW()
        FROM users
        WHERE organization_id IS NOT NULL
    ");

    // Step 3: Rename column (PostgreSQL supports this natively)
    Schema::table('users', function (Blueprint $table) {
        $table->renameColumn('organization_id', 'current_organization_id');
    });
}
```

### Migration: Add avatar column + expand role enum

```php
// Two separate migrations recommended for clarity
// Migration A: add avatar
Schema::table('users', function (Blueprint $table) {
    $table->string('avatar')->nullable()->after('email');
});

// Migration B: expand role — PostgreSQL CHECK constraint approach
DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner','admin','collaborator'))");
// Promote original org founders to 'owner':
DB::statement("
    UPDATE users u
    SET role = 'owner'
    WHERE u.id IN (
        SELECT o.created_by FROM organizations o WHERE o.created_by IS NOT NULL
    )
");
// Note: 'created_by' on organizations may not exist — see Open Questions
```

### HandleInertiaRequests: share organizations list

```php
// In HandleInertiaRequests::share() — replace existing auth block
'auth' => [
    'user' => $user ? [
        'id'                      => $user->id,
        'name'                    => $user->name,
        'email'                   => $user->email,
        'avatar'                  => $user->avatar,
        'role'                    => $user->getCurrentRoleAttribute(), // from pivot
        'preferences'             => $user->preferences,
        'current_organization_id' => $user->current_organization_id,
        'organization'            => $user->currentOrganization?->only(['id','name','slug','logo']),
        'organizations'           => $user->organizations->map(fn($o) => [
            'id'   => $o->id,
            'name' => $o->name,
            'slug' => $o->slug,
            'logo' => $o->logo,
            'role' => $o->pivot->role,
        ]),
        // Keep existing AI key props...
    ] : null,
],
```

### InvitationMail (Markdown)

```php
// app/Mail/InvitationMail.php
// Source: https://laravel.com/docs/12.x/mail#generating-mailables [CITED]
class InvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Invitation $invitation,
        public Organization $organization,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Convite para {$this->organization->name} no Briefy");
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.invitation',
            with: [
                'acceptUrl' => route('invitations.accept', $this->invitation->token),
                'orgName'   => $this->organization->name,
                'role'      => $this->invitation->role,
                'expiresAt' => $this->invitation->expires_at->format('d/m/Y'),
            ],
        );
    }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single org per user (`users.organization_id`) | Multi-org via pivot `organization_user` | This phase | Users can belong to multiple orgs simultaneously |
| `users.role` as flat column | Role stored per-membership in `organization_user.role` | This phase | User can be owner in Org A, collaborator in Org B |
| Intervention Image v2 (old API: `Image::make()`) | Intervention Image v3 (new API: `ImageManager->read()`) | 2023 | Breaking API change; use v3 syntax exclusively |
| Laravel `Mail::send()` with view | Mailable classes with `envelope()`/`content()` | Laravel 9+ | Cleaner; fully testable with `$mailable->assertSeeInHtml()` |

**Deprecated/outdated:**
- `intervention/image:^2`: Uses `Image::make()`, `->resize()`, `->save()` — v3 removed the static facade. Do not use v2 patterns.
- `users.role` as org-context role: After Phase 4, `organization_user.role` is canonical. `users.role` retained on table for backward compat but no new code should write to it for role management.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `organizations` table has no `created_by` column for identifying founders | Runtime State Inventory (role expansion) | If no `created_by`, promoting founders to `owner` requires different heuristic (e.g., "first user in org") |
| A2 | `php artisan storage:link` has NOT been run in this dev environment yet | Common Pitfalls | If already linked, running again prints a warning but is harmless |
| A3 | `intervention/image-laravel:^1` is compatible with `intervention/image:^3` | Standard Stack | v1 of the Laravel bridge targets v3 of the core; mismatch could cause service provider errors |
| A4 | `MAIL_MAILER=log` in current `.env` — Resend needs `MAIL_MAILER=resend` + `RESEND_API_KEY` | Email delivery | If no Resend API key in dev, invitation emails silently go to log; acceptable for dev but must be documented |
| A5 | `users.role` enum CHECK constraint in PostgreSQL was created by the existing enum migration (not a PostgreSQL TYPE) | Migration pattern | If it IS a named PostgreSQL TYPE, ALTER TABLE approach changes; needs `ALTER TYPE` instead |

---

## Open Questions

1. **How to identify "owner" for existing organizations?**
   - What we know: `organizations` table has no `created_by` column (not visible in model/fillable). `RegisteredUserController` creates org then user sequentially.
   - What's unclear: No foreign key on `organizations` pointing to the founder user. The only signal is "first user with `organization_id = X`" or "user with `role = 'admin'` and lowest `id` in org".
   - Recommendation: In the backfill migration, set `role = 'owner'` for the user with the lowest `id` per `organization_id`. All other users in that org get their existing role (`admin` or `collaborator`). Simple and correct for current single-user orgs.

2. **`users.role` dual-write during Phase 4: keep or deprecate?**
   - What we know: `HandleInertiaRequests` currently shares `$user->role`. Tests reference `$user->role`. 39 files reference `$user->organization_id` but not all reference `$user->role`.
   - What's unclear: Whether to keep `users.role` in sync (write-through) or treat it as deprecated immediately.
   - Recommendation: Keep `users.role` synced during Phase 4 (write-through: when pivot role changes, update `users.role` too). Full deprecation can happen in Phase 5+.

3. **Does `RegisteredUserController` need updating to write to pivot?**
   - What we know: It currently sets `users.organization_id` and `users.role`. After migration, it must also insert into `organization_user` and set `current_organization_id`.
   - What's unclear: Whether the migration's backfill covers future registrations.
   - Recommendation: Yes, `RegisteredUserController::store()` must be updated to: (1) set `current_organization_id` instead of `organization_id`, (2) set `role = 'owner'`, (3) also insert into `organization_user` with `role = 'owner'`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PHP GD extension | Avatar resize (Intervention Image) | ✓ | Built-in PHP 8.4 | — |
| PHP Imagick extension | Intervention Image (alt driver) | ✗ | — | GD driver (confirmed available) |
| `intervention/image` | Avatar resize | ✗ (not in vendor) | — | `composer require intervention/image:^3` |
| `resend/resend-laravel` | Invitation email | ✓ | v1.3.2 | MAIL_MAILER=log (dev fallback; emails in storage/logs) |
| `RESEND_API_KEY` env var | Email delivery via Resend | Unknown (not in .env.example) | — | Set MAIL_MAILER=log for dev; add to .env for staging/prod |
| `public/storage` symlink | Avatar URL serving | Unknown | — | `php artisan storage:link` |

**Missing dependencies with no fallback:**
- `intervention/image:^3` and `intervention/image-laravel:^1` — must install before avatar upload plan

**Missing dependencies with fallback:**
- `RESEND_API_KEY` — dev can use `MAIL_MAILER=log`; Wave 0 should document this

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | PHPUnit (via `phpunit/phpunit` in composer.json) |
| Config file | `phpunit.xml` (project root) |
| Quick run command | `php artisan test --filter=Team` |
| Full suite command | `php artisan test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEAM-01 | Admin can invite by email; invitation row created; email sent | Feature | `php artisan test --filter=InvitationControllerTest` | ❌ Wave 0 |
| TEAM-01 | Invitation token valid → accept page shown; expired token → error | Feature | `php artisan test --filter=InvitationAcceptTest` | ❌ Wave 0 |
| TEAM-02 | Team roster returns members with role and join date from pivot | Feature | `php artisan test --filter=TeamRosterTest` | ❌ Wave 0 |
| TEAM-03 | Admin can change role of collaborator; owner cannot be demoted | Feature | `php artisan test --filter=TeamRoleTest` | ❌ Wave 0 |
| TEAM-03 | Admin can remove member; owner cannot be removed | Feature | `php artisan test --filter=TeamRosterTest` | ❌ Wave 0 |
| TEAM-04 | User can update name, locale, theme; avatar upload resizes to 256x256 | Feature | `php artisan test --filter=ProfileControllerTest` | ❌ Wave 0 |
| TEAM-05 | Collaborator gets 403 on invite route | Feature | `php artisan test --filter=EnsureRoleTest` | ❌ Wave 0 |
| TEAM-05 | Collaborator cannot delete another user's demand | Feature | `php artisan test --filter=DemandAuthorizationTest` | ❌ Wave 0 |
| TEAM-06 | GET /settings returns 200; /settings/ai redirects to /settings | Feature | `php artisan test --filter=SettingsControllerTest` | ❌ Wave 0 |
| Migration | Existing users.organization_id data survives rename without data loss | Unit | `php artisan test --filter=OrganizationUserMigrationTest` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `php artisan test --filter=Team`
- **Per wave merge:** `php artisan test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/Feature/InvitationControllerTest.php` — covers TEAM-01
- [ ] `tests/Feature/InvitationAcceptTest.php` — covers TEAM-01 accept flow
- [ ] `tests/Feature/TeamRosterTest.php` — covers TEAM-02, TEAM-03
- [ ] `tests/Feature/TeamRoleTest.php` — covers TEAM-03 role change
- [ ] `tests/Feature/ProfileControllerTest.php` — covers TEAM-04
- [ ] `tests/Feature/EnsureRoleTest.php` — covers TEAM-05 middleware
- [ ] `tests/Feature/SettingsControllerTest.php` — covers TEAM-06
- [ ] `tests/Unit/Models/UserModelTest.php` — extend existing file with `isOwner()`, `isAdminOrOwner()`, `getCurrentRoleAttribute()` tests

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Laravel `Auth::login()` after invite acceptance; password via `Rules\Password::defaults()` |
| V3 Session Management | yes | Laravel session; `current_organization_id` in DB (not session) — org switch is persistent |
| V4 Access Control | yes | `EnsureRole` middleware + `isAdminOrOwner()` gate; collaborator restrictions enforced server-side |
| V5 Input Validation | yes | Invitation email: `email` rule; role: `in:admin,collaborator`; avatar: `image|max:2048|mimes:jpeg,png,webp` |
| V6 Cryptography | yes | `Str::uuid()` for token (cryptographically random); tokens are single-use (accepted_at set on use) |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Invitation token enumeration | Information Disclosure | Use UUID (128-bit random); 7-day expiry; single-use (accepted_at) |
| Cross-org data access (user in Org A reads Org B data) | Elevation of Privilege | All queries scoped to `current_organization_id`; abort(403) if org mismatch |
| Role escalation (collaborator invites admin) | Elevation of Privilege | `EnsureRole` middleware on invite route; role param validated to `in:admin,collaborator` (not owner) |
| Avatar path traversal | Tampering | `storeAs("avatars/users/{$user->id}.jpg")` — fixed filename from user ID, not user input |
| Expired invitation reuse | Tampering | `->where('expires_at', '>', now())->whereNull('accepted_at')` double-check on store() action |
| Mass assignment on User::create during invite acceptance | Tampering | Only `name`, `email`, `password`, `current_organization_id`, `role` in fillable |

---

## Sources

### Primary (HIGH confidence)

- Laravel 12.x Eloquent Relationships docs (many-to-many / belongsToMany / withPivot) — verified via WebFetch
- Laravel 12.x Mail docs (Mailable, Mail::fake()) — verified via WebFetch
- Laravel 12.x Authorization docs (Gates, Policies, `before()` hook) — verified via WebFetch
- Laravel 12.x File Storage docs (Storage::disk('public'), storeAs) — verified via WebFetch
- Intervention Image v3 installation and resize docs — verified via WebFetch
- `composer show --available intervention/image` — version 3.11.7 confirmed

### Secondary (MEDIUM confidence)

- Codebase analysis (`app/Http/Controllers/*.php`, `app/Models/User.php`, `database/migrations/`) — direct file reads
- `resend/resend-laravel` v1.3.2 in composer.json — confirmed present
- GD extension present on this machine — confirmed via `php -r "echo extension_loaded('gd')"`
- Packagist API for intervention/image versions — confirmed 3.11.7 latest stable

### Tertiary (LOW confidence)

- PostgreSQL enum CHECK constraint behavior (vs named TYPE) — [ASSUMED] based on known Laravel behavior but not verified against live DB schema

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against Packagist + installed packages
- Architecture: HIGH — based on direct codebase analysis of 12 controllers, 2 middleware, 3 models
- Migration strategy: HIGH — all 39 `organization_id` references verified via grep; risk areas documented
- Pitfalls: HIGH — derived from actual code patterns in this codebase
- Email delivery: MEDIUM — Resend installed, but RESEND_API_KEY not confirmed in .env

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (stable stack; Intervention Image v3 API is stable)
