# Phase 8: Multi-Org + Polish — Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 12 (new/modified)
**Analogs found:** 12 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/Http/Controllers/OrganizationController.php` | controller | request-response (CRUD) | `app/Http/Controllers/Settings/SettingsController.php` | role-match |
| `routes/web.php` (add route) | config/route | request-response | `routes/web.php` — existing `settings.` group | self |
| `tests/Feature/OrganizationCreationTest.php` | test | CRUD | `tests/Feature/SettingsControllerTest.php` | exact |
| `resources/js/Layouts/AppLayout.tsx` (OrgSwitcher + modal) | component/layout | request-response | `resources/js/Layouts/AppLayout.tsx` — OrgSwitcher block lines 198–251 | self |
| `resources/js/hooks/useAiStream.ts` (extend GET branch) | hook | streaming + event-driven | `resources/js/hooks/useAiStream.ts` — existing POST path | self |
| `resources/js/Components/ClientResearchTimelineModal.tsx` (migrate) | component | event-driven (SSE) | `resources/js/hooks/useAiStream.ts` | partial |
| `resources/js/Components/ChatTab.tsx` (conversation picker) | component | request-response | `resources/js/Layouts/AppLayout.tsx` — OrgSwitcher dropdown | role-match |
| `resources/js/types/index.d.ts` (expand types) | types/config | — | `resources/js/types/index.d.ts` self + `resources/js/Layouts/AppLayout.tsx` local PageProps | self |
| `resources/js/Components/AiIcon.tsx` (size enum) | component/utility | — | `resources/js/Components/AiIcon.tsx` self | self |
| `resources/js/pages/Clients/Edit.tsx` (Inertia v3 fix) | component/page | request-response | `resources/js/pages/Clients/Edit.tsx` self | self |
| `resources/js/Components/Sidebar.tsx` (TS fix) | component | request-response | `resources/js/pages/Demands/Trash.tsx` | role-match |
| `resources/js/pages/Demands/Trash.tsx` (TS fix) | page | request-response | `resources/js/Components/Sidebar.tsx` | role-match |

---

## Pattern Assignments

### `app/Http/Controllers/OrganizationController.php` (controller, CRUD)

**Analog:** `app/Http/Controllers/Settings/SettingsController.php`

**Namespace + imports pattern** (lines 1–9):
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\{RedirectResponse, Request};
```

**Validation + model create + pivot attach pattern** (from `SettingsController@switchOrg` lines 63–78 + `Organization` model):
```php
public function store(Request $request): RedirectResponse
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'slug' => 'required|string|max:100|alpha_dash|unique:organizations,slug',
    ]);

    $org = Organization::create($validated);

    // Attach creator as owner — mirrors the pivot used by InvitationController
    $org->users()->attach($request->user(), [
        'role'      => 'owner',
        'joined_at' => now(),
    ]);

    // Auto-switch to new org — same field write as SettingsController@switchOrg line 75
    $request->user()->update(['current_organization_id' => $org->id]);

    return redirect()->route('dashboard')->with('success', 'Organização criada.');
}
```

**Error handling pattern** — Laravel validation automatically returns 422 + `errors` bag via Inertia; no extra try/catch needed. Same pattern as every form action in the codebase.

---

### `routes/web.php` (add `POST /organizations` route)

**Analog:** `routes/web.php` lines 124–136 (settings prefix group) and lines 19–20 (auth middleware group).

**Route registration pattern** (lines 19–20 + 124):
```php
Route::middleware(['auth', 'verified'])->group(function () {
    // ... existing routes ...

    // New: organization creation — NOT inside settings. prefix (it creates a new org, not managing current)
    Route::post('/organizations', [\App\Http\Controllers\OrganizationController::class, 'store'])
        ->name('organizations.store');
```

Place this alongside the other top-level resource routes (after `Route::resource('clients', ...)`) — before the `settings.` prefix group.

---

### `tests/Feature/OrganizationCreationTest.php` (Feature test, CRUD)

**Analog:** `tests/Feature/SettingsControllerTest.php` (complete file, 52 lines)

**Test class + setUp pattern** (lines 1–18 of SettingsControllerTest):
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationCreationTest extends TestCase
{
    use RefreshDatabase;
```

**Test body pattern** — model `factory()->create()` + `$user->organizations()->attach(...)` + `actingAs($user)` then assert (from SettingsControllerTest lines 37–51):
```php
public function test_store_creates_org_and_attaches_owner(): void
{
    $existingOrg = Organization::factory()->create();
    $user = User::factory()->create([
        'current_organization_id' => $existingOrg->id,
    ]);
    $user->organizations()->attach($existingOrg->id, ['role' => 'owner', 'joined_at' => now()]);

    $this->actingAs($user);
    $response = $this->post(route('organizations.store'), [
        'name' => 'Nova Agência',
        'slug' => 'nova-agencia',
    ]);

    $response->assertRedirect(route('dashboard'));
    $this->assertDatabaseHas('organizations', ['slug' => 'nova-agencia']);
    $this->assertDatabaseHas('organization_user', [
        'user_id' => $user->id,
        'role'    => 'owner',
    ]);
    $user->refresh();
    $this->assertEquals('nova-agencia', $user->currentOrganization->slug);
}
```

Also add tests for: slug uniqueness → 422, unauthenticated → redirect to login.

---

### `resources/js/Layouts/AppLayout.tsx` — OrgSwitcher wire-up + CreateOrgModal (component, request-response)

**Analog:** `resources/js/Layouts/AppLayout.tsx` self — OrgSwitcher block lines 198–251 + bell dropdown lines 150–196.

**State + ref pattern for modal** (copy from orgSwitcher state at lines 53–54):
```tsx
const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
const orgSwitcherRef = useRef<HTMLDivElement>(null);
// ADD:
const [createOrgOpen, setCreateOrgOpen] = useState(false);
```

**Replace disabled button** (lines 238–247) with:
```tsx
<div className="border-t border-[#e5e7eb] dark:border-[#1f2937] mt-1 pt-1">
  <button
    onClick={() => {
      setOrgSwitcherOpen(false);   // close dropdown first (avoids Pitfall 4)
      setCreateOrgOpen(true);
    }}
    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#7c3aed] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] transition-colors"
  >
    <Plus size={14} />
    Criar nova organização
  </button>
</div>
```

**CreateOrgModal overlay pattern** — copy from `ClientResearchTimelineModal.tsx` lines 73–80:
```tsx
{createOrgOpen && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    onClick={() => setCreateOrgOpen(false)}
  >
    <div
      className="max-w-lg w-full rounded-[16px] bg-[#f9fafb] dark:bg-[#0b0f14] p-6 shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      {/* form fields: Nome + Slug */}
    </div>
  </div>
)}
```

**Inertia form submit pattern** — `router.post()` as used everywhere in the app:
```tsx
// MORG-01: use useForm (Inertia) for validation errors display
import { useForm } from '@inertiajs/react';
const { data, setData, post, processing, errors, reset } = useForm({ name: '', slug: '' });

const handleCreate = (e: React.FormEvent) => {
  e.preventDefault();
  post(route('organizations.store'), {
    onSuccess: () => { setCreateOrgOpen(false); reset(); },
  });
};
```

**Slug auto-generate on name input** (inline, D-04):
```tsx
const toSlug = (s: string) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// in onChange for the name field:
setData(prev => ({ ...prev, name: value, slug: toSlug(value) }));
```

---

### `resources/js/hooks/useAiStream.ts` — extend GET branch (hook, streaming + event-driven)

**Analog:** Self — current POST implementation lines 1–178.

**Interface extension** — add `onEvent` to `UseAiStreamOptions` (after line 24):
```typescript
export interface UseAiStreamOptions {
  url: string;
  method?: 'POST' | 'GET';
  body?: Record<string, unknown> | FormData;
  onDelta?: (chunk: string) => void;
  onDone?: (payload: unknown) => void;
  onError?: (message: string) => void;
  onEvent?: (type: string, data: unknown) => void;  // ADD — for GET custom events
  headers?: Record<string, string>;
}
```

**GET branch inside `start()`** — insert before the existing `fetch()` call (after line 69, inside the try block):
```typescript
// GET branch: use EventSource for native reconnect (D-14 / Pitfall 5)
if ((opts.method ?? 'POST') === 'GET') {
  const es = new EventSource(opts.url, { withCredentials: true });
  // Store close fn so cancel() works identically to POST branch
  const syntheticAbort = { abort: () => es.close() };
  abortRef.current = syntheticAbort as unknown as AbortController;

  return new Promise<void>((resolve) => {
    es.onmessage = (e: MessageEvent) => {
      try { opts.onEvent?.('message', JSON.parse(e.data)); } catch {}
    };
    // Custom event listener factory — called for each known event type
    const listenCustom = (type: string) => {
      es.addEventListener(type, (e: MessageEvent) => {
        if (type === 'done') {
          try { opts.onDone?.(e.data ? JSON.parse(e.data) : {}); } catch { opts.onDone?.({}); }
          setState('done');
          es.close();
          abortRef.current = null;
          resolve();
        } else if (type === 'error') {
          const msg = 'SSE error';
          setError(msg);
          opts.onError?.(msg);
          setState('error');
          es.close();
          abortRef.current = null;
          resolve();
        } else {
          try { opts.onEvent?.(type, JSON.parse(e.data)); } catch {}
        }
      });
    };
    listenCustom('status');
    listenCustom('done');
    listenCustom('error');

    es.onerror = () => {
      // EventSource reconnects automatically on transient errors; only treat as fatal
      // if readyState becomes CLOSED (2) by itself (not from our es.close() call).
      if (es.readyState === EventSource.CLOSED) {
        setError('SSE connection closed');
        opts.onError?.('SSE connection closed');
        setState('error');
        abortRef.current = null;
        resolve();
      }
    };
    setState('streaming');
  });
}
// else: fall through to existing fetch+ReadableStream POST path (unchanged)
```

---

### `resources/js/Components/ClientResearchTimelineModal.tsx` — migrate to useAiStream GET (component, event-driven)

**Analog:** Self (lines 1–136) — what to remove vs. keep.

**Remove** (lines 1–7 ARCH NOTE + lines 45–67 useEffect EventSource block):
```tsx
// DELETE this entire useEffect:
useEffect(() => {
  const es = new EventSource(
    `/clients/${clientId}/research/${sessionId}/events`,
    { withCredentials: true }
  );
  // ... lines 46-67
}, [clientId, sessionId]);
```

**Replace with** (using extended useAiStream):
```tsx
import { useAiStream } from '@/hooks/useAiStream';

// Inside component:
const stream = useAiStream({
  url: `/clients/${clientId}/research/${sessionId}/events`,
  method: 'GET',
  onEvent: (type, data) => {
    if (type === 'status') {
      setEvents(prev => [...prev, data as StatusFrame]);
    }
  },
  onDone: () => { /* stream complete; isActive will flip via latest.status */ },
  onError: () => { /* keep existing events, just stop listening */ },
});

useEffect(() => {
  stream.start();
  return () => stream.cancel();
}, [clientId, sessionId]);
```

**Remove ARCH NOTE** (lines 1–7 comment block) — it describes the old approach.

**Keep unchanged:** All JSX (lines 72–136), `StatusFrame` interface, `isActive` derived value, all display logic.

---

### `resources/js/Components/ChatTab.tsx` — conversation picker (component, request-response)

**Analog:** `resources/js/Layouts/AppLayout.tsx` — OrgSwitcher dropdown pattern lines 198–251.

**Replace `conv` state pattern** (current lines 58–62 + 70–75):
```tsx
// CURRENT (lines 58-62):
const latestConv = demand.conversations?.length
  ? demand.conversations[demand.conversations.length - 1]
  : null;
const [conv, setConv] = useState<Conversation | null>(latestConv);

// REPLACE WITH (selectedConvId pattern — survives Inertia partial reloads):
const latestConv = demand.conversations?.length
  ? demand.conversations[demand.conversations.length - 1]
  : null;
const [selectedConvId, setSelectedConvId] = useState<number | null>(latestConv?.id ?? null);
const conv = demand.conversations?.find(c => c.id === selectedConvId) ?? latestConv;
const isLatest = !latestConv || conv?.id === latestConv.id;
```

**Replace useEffect sync** (current lines 70–75):
```tsx
// CURRENT:
useEffect(() => {
  const updated = demand.conversations?.length
    ? demand.conversations[demand.conversations.length - 1]
    : null;
  setConv(updated);    // ← BUG: overwrites picker selection
}, [demand.conversations]);

// REPLACE WITH — only update selectedConvId if user hasn't manually picked:
useEffect(() => {
  const latest = demand.conversations?.length
    ? demand.conversations[demand.conversations.length - 1]
    : null;
  if (!latest) return;
  // Only auto-advance to latest when user is already on the latest or has no selection
  setSelectedConvId(prev => {
    const wasOnLatest = !prev || demand.conversations?.find(c => c.id === prev)
      ? prev === (demand.conversations?.[demand.conversations.length - 2]?.id ?? prev)
      : true;
    return wasOnLatest ? latest.id : prev;
  });
}, [demand.conversations]);
// Simpler alternative: just never override if selectedConvId already exists in the list
```

**Picker dropdown** — copy OrgSwitcher pattern (AppLayout lines 198–251):
```tsx
// Add state at top of component:
const [pickerOpen, setPickerOpen] = useState(false);
const pickerRef = useRef<HTMLDivElement>(null);

// Add outside-click close (copy pattern from AppLayout lines 98-107):
useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
      setPickerOpen(false);
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, []);

// Dropdown label helper (D-07):
const convLabel = (c: Conversation) =>
  c.title ??
  `${new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${c.messages.length} msgs`;
```

**Replace header** (current lines 188–207) — keep `+ Nova conversa` button, add picker:
```tsx
<div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-2.5 dark:border-[#1f2937]">
  {/* Conversation picker */}
  <div ref={pickerRef} className="relative">
    <button
      type="button"
      onClick={() => setPickerOpen(v => !v)}
      className="flex items-center gap-1 text-xs text-[#9ca3af] hover:text-[#6b7280]"
    >
      <span>{conv ? convLabel(conv) : 'Conversa atual'}</span>
      <ChevronDown size={10} className={`transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
    </button>
    {pickerOpen && demand.conversations && demand.conversations.length > 1 && (
      <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-[12px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] shadow-lg">
        {demand.conversations.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => { setSelectedConvId(c.id); setPickerOpen(false); }}
            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] ${
              c.id === selectedConvId ? 'text-[#7c3aed]' : 'text-[#6b7280]'
            }`}
          >
            <span className="flex-1 truncate">{convLabel(c)}</span>
            {c.id === latestConv?.id && <Check size={10} className="shrink-0 text-[#7c3aed]" />}
          </button>
        ))}
      </div>
    )}
  </div>
  {/* Nova conversa button — unchanged */}
  <button type="button" onClick={handleNovaConversa} ...>
```

**Disable input/send for old conversations** (D-08) — add `isLatest` guard to textarea and send button:
```tsx
// textarea (current line 309):
disabled={!hasKey || !isLatest}

// send button (current line 315):
disabled={!input.trim() || isStreaming || !hasKey || !isLatest}
```

**After `handleNovaConversa` creates new conv** — reset `selectedConvId` to follow latest:
```tsx
// After startConversation() resolves and router.reload() fires, selectedConvId should
// advance to new latest. Guard in useEffect handles this automatically if pattern above is used.
// Also reset explicitly on create:
setSelectedConvId(null);   // null → falls back to latestConv in derived state
```

---

### `resources/js/types/index.d.ts` — expand global types (POLISH-02)

**Analog:** Self (lines 1–41) + `AppLayout.tsx` local `PageProps` lines 21–37 (which is the complete authoritative shape).

**Expand `User` interface** (replace current lines 2–7):
```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  avatar: string | null;
  role: string | null;                         // ADD — from User::getCurrentRoleAttribute()
  preferences: Record<string, unknown> | null; // ADD
  current_organization_id: number | null;      // ADD
  organization: {                              // ADD — nested org shape (matches AppLayout local type)
    id: number; name: string; slug: string; logo: string | null;
  } | null;
  organizations: Array<{                       // ADD
    id: number; name: string; slug: string; logo: string | null; role: string;
  }>;
}
```

**Expand `AuthOrganization` interface** (replace current lines 9–16):
```typescript
export interface AuthOrganization {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  has_anthropic_key: boolean;
  anthropic_api_key_mask: string | null;
  key_valid: boolean;              // ADD
  managed_agents_enabled: boolean; // ADD
  last_key_check_at: string | null; // ADD
}
```

**Expand `PageProps` type** (replace current lines 18–25):
```typescript
export type PageProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
  auth: {
    user: User;
    organization: AuthOrganization | null;
  };
  archive_count: number;                            // ADD — Sidebar line 152
  trash_count: number;                              // ADD — consistently available
  flash?: { success?: string; error?: string };     // ADD — FlashMessage
  unread_notifications: number;                     // ADD — AppLayout line 45
};
```

**After expanding global PageProps:** remove local `interface PageProps` declarations in every affected component (BriefTab, ChatTab, DemandDetailModal, FlashMessage, useTheme, Demands/Show). Replace with:
```typescript
import { PageProps } from '@/types';
// or just use usePage<PageProps>().props with no local override
```

---

### `resources/js/Components/AiIcon.tsx` — add size `11` and `14` to enum (POLISH-02)

**Analog:** Self (lines 1–57).

**Change line 6** only:
```typescript
// CURRENT:
size?: 12 | 16 | 20 | 24 | 32 | 48 | 64;

// REPLACE WITH:
size?: 11 | 12 | 14 | 16 | 20 | 24 | 32 | 48 | 64;
```

No other changes. The `width`/`height` attributes accept any number — existing icons are unaffected.

---

### `resources/js/pages/Clients/Edit.tsx` — fix Inertia v3 `post()` data bug (POLISH-02)

**Analog:** Self (lines 44–51).

**Problem** (current lines 49–51):
```typescript
post(route('clients.update', client.id), {
  data: { ...data, social_handles: cleanedHandles },  // TS2353: 'data' not in UseFormSubmitOptions
});
```

**Fix** — use `setData` before `post()` (Inertia v3 pattern: data lives in form state, not submit options):
```typescript
const submit = (e: React.FormEvent) => {
  e.preventDefault();
  const cleanedHandles = Object.fromEntries(
    Object.entries(data.social_handles ?? {}).filter(([, v]) => v && String(v).trim() !== '')
  );
  setData('social_handles', cleanedHandles);
  // post() on the next tick after setData — use transform() if synchronous guarantee needed
  post(route('clients.update', client.id));
};
```

Alternatively (if synchronous data transform is critical):
```typescript
// Use transform() hook — called just before submit, doesn't mutate the form state
// Note: useForm doesn't expose transform() in all versions; check @inertiajs/react types first
```

---

### `resources/js/Components/Sidebar.tsx` and `resources/js/pages/Demands/Trash.tsx` — TS cast fixes (POLISH-02)

**Pattern to remove** — unsafe spread cast (Sidebar line 152, Trash line 33):
```typescript
// Sidebar line 152 (CURRENT — unsafe cast):
const { archive_count } = usePage().props as { archive_count: number; [key: string]: unknown };

// Trash line 33 (CURRENT — unsafe cast):
const { auth } = usePage().props as { auth: { user: { role: string } }; [key: string]: unknown };
```

**Pattern to use after PageProps expansion:**
```typescript
// Sidebar — after expanding global PageProps to include archive_count:
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
const { archive_count } = usePage<PageProps>().props;  // no cast needed

// Trash — after expanding User to include role: string | null:
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
const { auth } = usePage<PageProps>().props;
// auth.user.role is now string | null — guard downstream: auth.user.role === 'admin'
```

**Dependency:** Both fixes only become possible after `index.d.ts` expansion (POLISH-02 Step 1 + Step 3).

---

## Shared Patterns

### Modal overlay (applies to CreateOrgModal in AppLayout)

**Source:** `resources/js/Components/ClientResearchTimelineModal.tsx` lines 73–80
```tsx
<div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
  onClick={onClose}
>
  <div
    className="max-w-lg w-full rounded-[16px] bg-white p-6 shadow-lg dark:bg-[#111827] dark:text-[#f9fafb]"
    onClick={e => e.stopPropagation()}
  >
```
For MORG-01: use `bg-[#f9fafb] dark:bg-[#0b0f14]` and `shadow-2xl` per CONTEXT.md specifics.

### Dropdown (applies to OrgSwitcher wired button + ChatTab picker)

**Source:** `resources/js/Layouts/AppLayout.tsx` lines 213–214
```tsx
className="absolute right-0 top-10 z-50 w-56 rounded-[12px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] shadow-lg"
```
Outside-click close pattern: `useRef` + `useEffect` with `document.addEventListener('mousedown', handler)` — see AppLayout lines 99–107.

### Inertia form submit (applies to CreateOrgModal)

**Source:** `resources/js/Layouts/AppLayout.tsx` lines 219–222 (org switch) and `resources/js/pages/Clients/Edit.tsx` lines 44–51 (form pattern)
```tsx
// useForm + post():
const { data, setData, post, processing, errors, reset } = useForm({ name: '', slug: '' });
post(route('organizations.store'), {
  onSuccess: () => { /* close modal, reset form */ },
});
// errors.name / errors.slug automatically populated from Laravel 422 response
```

### Feature test setUp (applies to OrganizationCreationTest)

**Source:** `tests/Feature/SettingsControllerTest.php` lines 37–46 + `tests/Feature/AiChatControllerTest.php` lines 23–38
```php
use Illuminate\Foundation\Testing\RefreshDatabase;

class OrganizationCreationTest extends TestCase
{
    use RefreshDatabase;
    // Factory + attach pattern:
    $org  = Organization::factory()->create();
    $user = User::factory()->create(['current_organization_id' => $org->id]);
    $user->organizations()->attach($org->id, ['role' => 'owner', 'joined_at' => now()]);
    $this->actingAs($user);
}
```

### Organization model `users()->attach()` pattern

**Source:** `app/Models/Organization.php` lines 66–71 + `tests/Feature/SettingsControllerTest.php` line 19
```php
$org->users()->attach($user->id, [
    'role'      => 'owner',   // or 'collaborator', 'admin'
    'joined_at' => now(),
]);
```

---

## No Analog Found

All files in Phase 8 have direct analogs in the codebase. No external patterns required.

---

## Metadata

**Analog search scope:** `app/Http/Controllers/`, `resources/js/hooks/`, `resources/js/Components/`, `resources/js/Layouts/`, `resources/js/types/`, `tests/Feature/`, `routes/`
**Files scanned:** 14 source files + 2 test files
**Pattern extraction date:** 2026-04-24
