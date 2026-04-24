# Phase 8: Multi-Org + Polish — Research

**Researched:** 2026-04-24
**Domain:** Laravel organization creation, SSE hook architecture, TypeScript global types, React conversation picker
**Confidence:** HIGH (all findings verified directly against codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**MORG-01 — Multi-org creation**
- D-01: Entry point = `+ Criar organização` button in OrgSwitcher dropdown (after org list, separated by divider). Not in /settings tab.
- D-02: Click opens modal with two fields: Nome (required) and Slug (auto-generated from name, editable). Buttons: Cancelar and Criar.
- D-03: On success: auto-switch to new org and redirect to /dashboard. New org appears immediately in OrgSwitcher.
- D-04: Slug auto-generated via JS on name input (slugify: lowercase, hyphens, no accents). User can edit before creating.
- D-05: Creator gets `owner` role automatically (existing backend pattern).

**POLISH-03 — Conversation picker (ChatTab)**
- D-06: UI = dropdown in ChatTab header, next to "Chat IA". Default label: name/date of current conversation or "Conversa atual". Arrow `▾` indicates clickable.
- D-07: Per conversation in dropdown: date + message count — e.g. "24 Abr — 8 msgs". If conversation has `title`, use it; otherwise use date.
- D-08: Selecting an older conversation swaps local `conv` (no modal reload). Input and streaming disabled for old conversations (read-only) — only active conversation accepts new messages.
- D-09: `+ Nova conversa` button stays in header (next to or below dropdown). Creates new conversation and auto-selects in dropdown.
- D-10: Backend already loads `demand.conversations[]` in DemandController. Frontend needs only the picker UI — no new route needed.

**POLISH-01 — SSE consolidation**
- D-11: Extend `useAiStream` to support GET SSE with custom events (in addition to current POST delta-frame). Hook API gains `method: 'GET'` and `onEvent: (type, data) => void` for custom event types (`progress`, `step`, `done`, `error`).
- D-12: Migrate `ClientResearchTimelineModal.tsx` to use `useAiStream` with `method: 'GET'`. Remove `useEffect` block with `new EventSource(...)`.
- D-13: Hook keeps name `useAiStream`. ARCH NOTE in ClientResearchTimelineModal removed after migration. POST/GET distinction encapsulated internally.
- D-14: Ensure migration doesn't break EventSource reconnect — implement retry/reconnect inside hook if needed.

**POLISH-02 — TypeScript zero errors**
- D-15: Meta: `npx tsc --noEmit` returns 0 errors after phase.
- D-16: Fix global `PageProps` in `resources/js/types/index.d.ts` to include all fields actually sent by server: `role`, `organization` (with `has_anthropic_key`, `anthropic_api_key_mask`, etc.), `current_organization_id`, `organizations[]`. Fix at root — no file needs local cast.
- D-17: For AiIcon size enum: add sizes `11` and `14` to accepted values list (or swap call sites to valid values like `12` and `16`). Criterion: no visual change to any existing icon.
- D-18: Fix all other TypeScript errors listed in tsc output (Demands/Trash.tsx, Clients/Edit.tsx, Clients/Show.tsx, PlanningItemModal.tsx, Sidebar.tsx, etc.) using root-fix approach — no `as any`.

### Claude's Discretion
- Internal structure of extended useAiStream (how to separate POST/GET internally)
- Whether to add `11` and `14` to the enum or swap call sites — choose what doesn't alter visually
- Exact layout of the conversation picker dropdown within the existing ChatTab header
- Order of fields in the org creation modal (Nome first, Slug second)

### Deferred Ideas (OUT OF SCOPE)
- Logo upload in org creation modal — only Nome + Slug in this phase
- Rename/delete organization — out of scope for this phase
- AI-generated conversation titles — only display existing title; auto-generation is v2
- Complete offline cache (sw.js) — D-06 from Phase 7, deferred
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MORG-01 | Existing user can create new org from /settings without re-registering | Backend POST route + modal creation pattern; OrgSwitcher already has disabled stub button |
| POLISH-01 | SSE stream pattern consolidated — single hook covers both streaming chat and server-sent AI events | useAiStream full implementation read; ClientResearchTimelineModal EventSource block read; API difference documented |
| POLISH-02 | TypeScript strict errors resolved — auth.organization shape mismatch + AiIcon size enum gaps | All 15 errors catalogued from `npx tsc --noEmit`; root cause identified in global.d.ts + index.d.ts |
| POLISH-03 | User can pick from previous AI conversations in demand AI chat panel | ChatTab full implementation read; demand.conversations[] already loaded; no backend work needed |
</phase_requirements>

---

## Summary

Phase 8 delivers four independent items that share no state or dependencies between them, making them safe to plan and execute in any order. MORG-01 requires one new backend route and controller action plus a frontend modal. POLISH-01 requires extending an existing hook and migrating one component. POLISH-02 requires fixing the global TypeScript type definitions at the root level. POLISH-03 requires adding a conversation picker dropdown to ChatTab with no backend changes.

The most important discovery is that the OrgSwitcher in `AppLayout.tsx` **already has a disabled stub** for `+ Criar nova organização` (lines 238-247) — wiring it up is the primary work. No migration is needed for the organizations table. The `organization_user` pivot already supports multiple orgs per user with roles. Backend only needs a new `OrganizationController@store` action and a route.

For POLISH-02, the root cause is clear: `global.d.ts` augments `@inertiajs/core`'s `PageProps` via `AppPageProps` (from `index.d.ts`), but `AppPageProps` only defines the bare minimum `{ auth: { user: User; organization: AuthOrganization | null } }`. The server actually sends `auth.user` with additional fields (`role`, `current_organization_id`, `organizations`, `preferences`, `avatar`). Each component that needs those extra fields defines its own local `PageProps` type — which then conflicts with the global `PageProps` constraint, causing the 15 TS errors. The fix is to expand `index.d.ts` to match the real server payload.

**Primary recommendation:** Sequence as POLISH-02 first (unblocks clean types for all other changes), then MORG-01, POLISH-03, POLISH-01 — since the SSE refactor carries the highest risk.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Create new organization | API / Backend | Frontend modal | Requires DB write + pivot insert; frontend only submits the form |
| Auto-switch to new org | Frontend (Inertia router) | Backend (switchOrg route) | POST creates org; PATCH sets `current_organization_id` — both already exist |
| Slug auto-generation | Browser / Client | — | Pure JS slugify on input; no server roundtrip needed |
| SSE GET stream | Browser / Client | — | EventSource/fetch in hook; no backend change needed (route already exists) |
| TypeScript type fixes | Frontend | — | Pure type declaration changes; no runtime behavior |
| Conversation picker UI | Browser / Client | — | Switches local `conv` state; data already in `demand.conversations[]` |

---

## Standard Stack

### Core (no new dependencies needed)

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| React 19 | installed | Component UI | All four items are frontend-focused |
| Inertia.js v3 | installed | SPA routing + Inertia forms | `router.post()` for org creation |
| TypeScript | installed | Strict type checking | Root fix in `index.d.ts` / `global.d.ts` |
| Laravel 13 | installed | Backend API | New `OrganizationController@store` only |

**No new npm or Composer packages are required for Phase 8.** All changes use existing infrastructure.

---

## Architecture Patterns

### MORG-01: Multi-Org Creation

#### Current OrgSwitcher State

`AppLayout.tsx` lines 238-247 already contain the placeholder:

```tsx
// VERIFIED: resources/js/Layouts/AppLayout.tsx lines 238-247
<div className="border-t border-[#e5e7eb] dark:border-[#1f2937] mt-1 pt-1">
  <button
    disabled
    title="Em breve"
    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#7c3aed] opacity-50 cursor-not-allowed"
  >
    <Plus size={14} />
    Criar nova organização
  </button>
</div>
```

**Task:** Replace `disabled` button with a working button that opens a modal.

#### Backend: No Route Exists

`routes/web.php` has no `POST /organizations` route. [VERIFIED: routes/web.php read]. The only organization routes are:
- `PATCH /settings/current-org` — switches active org (already used by OrgSwitcher for switching)
- `PATCH /settings/organization` — updates current org name/slug

A new `POST /organizations` route and `OrganizationController@store` action must be created.

#### Organization Model is Ready

`Organization` model supports: `name`, `slug` (unique), `logo`, `settings`, encrypted AI key fields. [VERIFIED: app/Models/Organization.php]

`organization_user` pivot: `user_id`, `organization_id`, `role` (default `'collaborator'`), `joined_at`. [VERIFIED: migration 2026_04_23_300000]

`User::switchOrg` pattern from `SettingsController@switchOrg` is the template for post-create auto-switch:

```php
// VERIFIED: app/Http/Controllers/Settings/SettingsController.php
$user->update(['current_organization_id' => $newOrg->id]);
```

#### Backend Controller Pattern

```php
// New: app/Http/Controllers/OrganizationController.php
public function store(Request $request): RedirectResponse
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'slug' => 'required|string|max:100|alpha_dash|unique:organizations,slug',
    ]);

    $org = Organization::create($validated);
    // Attach creator as owner (D-05)
    $org->users()->attach($request->user(), [
        'role' => 'owner',
        'joined_at' => now(),
    ]);
    // Auto-switch (D-03)
    $request->user()->update(['current_organization_id' => $org->id]);

    return redirect()->route('dashboard')->with('success', 'Organização criada.');
}
```

#### Frontend Modal Pattern

Modal visual matches `DemandDetailModal` and other modals in the app:

```tsx
// VERIFIED PATTERN: resources/js/Components/ClientResearchTimelineModal.tsx lines 73-79
<div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
  onClick={onClose}
>
  <div
    className="max-w-lg w-full rounded-[16px] bg-white p-6 shadow-lg dark:bg-[#111827] dark:text-[#f9fafb]"
    onClick={e => e.stopPropagation()}
  >
```

For CONTEXT.md specifics (D-05 in specifics section):
- `rounded-[16px]`, `bg-[#f9fafb] dark:bg-[#0b0f14]`, `shadow-2xl`

Slug JS generation (D-04):
```typescript
// ASSUMED — standard slugify inline
const toSlug = (s: string) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
```

After `router.post()` to create org, Inertia's `onSuccess` triggers a redirect to `/dashboard` via the server response (standard pattern: `return redirect()->route('dashboard')`).

---

### POLISH-01: SSE Hook Extension

#### Current useAiStream (POST delta-frame path)

Full implementation at `resources/js/hooks/useAiStream.ts`. [VERIFIED]

Current capabilities:
- Uses `fetch()` + `ReadableStream` for POST requests
- Parses SSE frames: `event: delta` → `onDelta(chunk)`, `event: done` → `onDone(payload)`, `event: error` → `onError(msg)`
- `AbortController` for cancellation
- `UseAiStreamOptions.method` already declared as `'POST' | 'GET'` but only POST logic is implemented

**Key observation:** `method?: 'POST' | 'GET'` is already in the interface (line 17) but unused — it defaults to POST and GET was never implemented. This is a clean extension point.

#### ClientResearchTimelineModal: What Needs to Change

Current EventSource block (to be replaced):

```tsx
// VERIFIED: resources/js/Components/ClientResearchTimelineModal.tsx lines 45-67
useEffect(() => {
  const es = new EventSource(
    `/clients/${clientId}/research/${sessionId}/events`,
    { withCredentials: true }
  );
  const onStatus = (e: MessageEvent) => {
    try {
      const data: StatusFrame = JSON.parse(e.data);
      setEvents(prev => [...prev, data]);
    } catch { }
  };
  es.addEventListener('status', onStatus);
  es.addEventListener('done', () => es.close());
  es.onerror = () => es.close();
  return () => { es.close(); };
}, [clientId, sessionId]);
```

The GET SSE endpoint (`/clients/{clientId}/research/{sessionId}/events`) emits:
- `event: status` with `data: { status: string, progress_summary: string | null }`
- `event: done` (signals completion)

#### SSE Protocol Difference

| Property | POST delta-frame (current) | GET custom-events (needed) |
|----------|---------------------------|---------------------------|
| HTTP method | POST with CSRF + JSON body | GET with credentials |
| Event types | `delta`, `done`, `error` | `status`, `done`, `error` (custom) |
| Native reconnect | No (fetch-based) | Yes (EventSource built-in) |
| Auth | CSRF token in header | Session cookie (`withCredentials`) |
| Data direction | User sends message → server streams reply | Server streams progress → user reads |

#### Extension Strategy (Claude's Discretion)

Two internal branches in `start()`:

```typescript
// PATTERN — extend start() to branch on method
if (opts.method === 'GET') {
  // Use EventSource for native reconnect (D-14)
  const es = new EventSource(opts.url, { withCredentials: true });
  // Dispatch all events via opts.onEvent(type, data)
  // Map 'done' to setState('done') + opts.onDone?.()
  // Map 'error' to setState('error') + opts.onError?.()
  // Store es.close in abortRef.current for cancel() compatibility
} else {
  // Existing fetch+ReadableStream path (unchanged)
}
```

New option needed in `UseAiStreamOptions`:
```typescript
onEvent?: (type: string, data: unknown) => void; // custom event handler for GET SSE
```

After migration, `ClientResearchTimelineModal` becomes:
```tsx
const stream = useAiStream({
  url: `/clients/${clientId}/research/${sessionId}/events`,
  method: 'GET',
  onEvent: (type, data) => {
    if (type === 'status') {
      setEvents(prev => [...prev, data as StatusFrame]);
    }
  },
  onDone: () => { /* closed */ },
});

useEffect(() => {
  stream.start();
  return () => stream.cancel();
}, [clientId, sessionId]);
```

---

### POLISH-02: TypeScript Zero Errors

#### Root Cause Analysis

**Mechanism:** `resources/js/types/global.d.ts` augments `@inertiajs/core`'s `PageProps` interface:

```typescript
// VERIFIED: resources/js/types/global.d.ts
declare module '@inertiajs/core' {
  interface PageProps extends InertiaPageProps, AppPageProps {}
}
```

`AppPageProps` (from `index.d.ts`) currently defines:

```typescript
// VERIFIED: resources/js/types/index.d.ts
export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  auth: {
    user: User;
    organization: AuthOrganization | null;
  };
};
```

**The constraint:** `@inertiajs/core`'s `PageProps` requires `auth.organization` (because the global augmentation puts it there). But individual components define their own local `PageProps` without `auth.organization` — causing TS2344.

**What the server actually sends** (from `HandleInertiaRequests.php`): [VERIFIED]

```typescript
// auth.user shape from HandleInertiaRequests.php
{
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: string | null;           // getCurrentRoleAttribute() — can be null
  preferences: Record<string, unknown> | null;
  current_organization_id: number | null;
  organization: {
    id: number; name: string; slug: string; logo: string | null;
    has_anthropic_key: boolean; anthropic_api_key_mask: string | null;
    key_valid: boolean; managed_agents_enabled: boolean;
    last_key_check_at: string | null;
  } | null;
  organizations: Array<{
    id: number; name: string; slug: string; logo: string | null; role: string;
  }>;
}
```

#### The 15 Errors (verified by `npx tsc --noEmit`) [VERIFIED]

| File | Error | Root Cause | Fix |
|------|-------|-----------|-----|
| `BriefTab.tsx` | TS2344 — local PageProps missing `auth.organization` | Local type < global PageProps constraint | Remove local PageProps, use global |
| `ChatTab.tsx` | TS2344 — same | Same | Same |
| `DemandDetailModal.tsx` | TS2344 — same | Same | Same |
| `FlashMessage.tsx` | TS2344 — same | Same | Same |
| `hooks/useTheme.ts` | TS2344 — same | Same | Same |
| `pages/Demands/Show.tsx` | TS2344 — same | Same | Same |
| `PlanningItemModal.tsx` | TS2322 — `size={14}` not in AiIcon enum | AiIcon only accepts `12|16|20|24|32|48|64` | Add `14` to enum or change to `16` |
| `Sidebar.tsx` | TS2352 — `archive_count` not in PageProps | Custom prop cast missing from global type | Add `archive_count: number` to global shared props |
| `Clients/Edit.tsx` | TS2353 — `data` not in `UseFormSubmitOptions` | `post(url, { data: ... })` invalid in Inertia v3 | Use `setData(...)` then `post(url)` instead |
| `Clients/Index.tsx` | TS2322 — `size={11}` | AiIcon enum gap | Add `11` to enum or change to `12` |
| `Clients/Show.tsx` (×2) | TS2322 — `size={14}` and `size={11}` | AiIcon enum gap | Same |
| `Demands/Trash.tsx` | TS2352 — `auth.user.role` missing in global User | Local cast conflicts with global PageProps | Add `role` to global `User` type |
| `Planejamento/Index.tsx` (×2) | TS2322 — `size={11}` and `size={14}` | AiIcon enum gap | Same |

**Total: 15 errors across 13 files.**

#### Fix Strategy

**Step 1: Update `User` interface in `index.d.ts`** to match full server payload:

```typescript
// resources/js/types/index.d.ts
export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  avatar: string | null;
  role: string | null;                    // ADD — from getCurrentRoleAttribute()
  preferences: Record<string, unknown> | null; // ADD
  current_organization_id: number | null; // ADD
  organizations: Array<{                  // ADD
    id: number; name: string; slug: string; logo: string | null; role: string;
  }>;
}
```

**Step 2: Update `AuthOrganization` in `index.d.ts`** to include new fields from HandleInertiaRequests:

```typescript
export interface AuthOrganization {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  has_anthropic_key: boolean;
  anthropic_api_key_mask: string | null;
  key_valid: boolean;             // ADD — M3 field
  managed_agents_enabled: boolean; // ADD — M3 field
  last_key_check_at: string | null; // ADD — M3 field
}
```

**Step 3: Update `PageProps` in `index.d.ts`** to include shared props:

```typescript
export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  auth: {
    user: User;
    organization: AuthOrganization | null;
  };
  archive_count: number;    // ADD — Sidebar needs this
  trash_count: number;      // ADD — consistently available
  locale: string;           // ADD — always shared
  flash: { success?: string; error?: string }; // ADD — FlashMessage needs this
  unread_notifications: number; // ADD — AppLayout needs this
};
```

**Step 4: Remove local `PageProps` definitions** in each affected component — they become redundant once the global type is correct. Components that need specific page props (e.g. `BriefTab`, `ChatTab`) should use the global type and access `auth` directly, not re-declare a local `PageProps`.

**Step 5: Fix `AiIcon` size enum** — add `11` and `14`:

```typescript
// resources/js/Components/AiIcon.tsx
size?: 11 | 12 | 14 | 16 | 20 | 24 | 32 | 48 | 64;
```

This is visually safe since `AiIcon` uses `width`/`height` attributes — adding 11px and 14px variants doesn't change existing uses.

**Step 6: Fix `Clients/Edit.tsx`** — `post(url, { data: ... })` is invalid in Inertia v3 (`UseFormSubmitOptions = Omit<VisitOptions, 'data'>`). Fix:

```typescript
// Instead of: post(route('clients.update', client.id), { data: { ...data, social_handles: cleanedHandles } })
// Use:
setData('social_handles', cleanedHandles);
post(route('clients.update', client.id));
// OR use router.post() directly if runtime data transformation is needed
```

**Step 7: Fix `Demands/Trash.tsx` and `Sidebar.tsx`** — replace unsafe `as` casts with typed `usePage<PageProps>().props` once the global type includes the needed fields.

---

### POLISH-03: Conversation Picker

#### Current ChatTab State

Full implementation at `resources/js/Components/ChatTab.tsx`. [VERIFIED]

**Current header** (lines 189-207):

```tsx
<div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-2.5 dark:border-[#1f2937]">
  <p className="text-xs text-[#9ca3af]">
    {conv ? t('ai.chat.startedAt', { date: ... }) : ''}
  </p>
  <button type="button" onClick={handleNovaConversa} ...>
    <Plus size={12} />
    {confirmingNew ? ... : t('ai.chat.newConversation')}
  </button>
</div>
```

**Current `conv` management:**
- `const latestConv = demand.conversations?.[demand.conversations.length - 1] ?? null`
- `const [conv, setConv] = useState<Conversation | null>(latestConv)`
- `useEffect` syncs `conv` to latest when `demand.conversations` changes (Inertia partial reload)
- `stream.start()` uses `conv.id` in the URL

**Already has all the data needed:** `demand.conversations[]` is loaded by DemandController, each entry has `id`, `title?`, `messages: ChatMessage[]`, `created_at`, `compacted_at?`.

#### Conversation Count

```typescript
// VERIFIED: AiConversation in index.d.ts
export interface AiConversation {
  id: number;
  title?: string;
  compacted_at?: string | null;
  messages: ChatMessage[];
  created_at: string;
}
```

Message count per conversation = `conv.messages.length`.

#### Picker Logic

The key behavioral rule from D-08:
- Selected conv ID !== latest conv ID → textarea + send button disabled
- Only `demand.conversations[last]` is the "active" conversation
- `useEffect` that syncs to latest must be guarded: only sync if user hasn't manually selected an older conv

**Suggested pattern for tracking selected vs latest:**

```typescript
const latestConv = demand.conversations?.[demand.conversations.length - 1] ?? null;
const [selectedConvId, setSelectedConvId] = useState<number | null>(latestConv?.id ?? null);
const conv = demand.conversations?.find(c => c.id === selectedConvId) ?? latestConv;
const isLatest = !latestConv || conv?.id === latestConv.id;
```

When user sends a message or creates a new conv, reset `selectedConvId` to `latestConv.id`.

#### Dropdown Label (D-07)

```typescript
// ASSUMED — pt-BR date formatting inline
const convLabel = (c: Conversation) =>
  c.title ??
  `${new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${c.messages.length} msgs`;
```

#### Dropdown Visual Pattern

Matches OrgSwitcher style (D-06 in specifics):
```tsx
// absolute right-0, w-56, rounded-[12px], border, shadow-lg
// Same pattern as OrgSwitcher dropdown in AppLayout.tsx lines 213-214
className="absolute right-0 top-full mt-1 z-50 w-56 rounded-[12px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] shadow-lg"
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Org slug uniqueness validation | Custom JS async check | Laravel `unique:organizations,slug` validation rule | Server already owns uniqueness; client shows server error via Inertia `errors` |
| SSE reconnect logic | Manual retry with setTimeout | EventSource native reconnect (via the GET branch of useAiStream) | EventSource reconnects automatically on dropped connections; fetch-based streams do not |
| Organization creation + pivot insert | Manual SQL | Eloquent `$org->users()->attach($user, [...])` | Pivot relation already exists; `attach()` handles both insert and timestamps |

---

## Common Pitfalls

### Pitfall 1: Inertia `useEffect` sync overwrites picker selection

**What goes wrong:** After a message send triggers `router.reload({ only: ['selectedDemand'] })`, the existing `useEffect` on `demand.conversations` resets `conv` to the latest conversation, discarding the user's picker selection.

**Why it happens:** Current `useEffect` always sets conv to latest:
```typescript
// ChatTab.tsx lines 70-75 — current behavior
useEffect(() => {
  const updated = demand.conversations?.length
    ? demand.conversations[demand.conversations.length - 1]
    : null;
  setConv(updated);         // ← overwrites any picker selection
}, [demand.conversations]);
```

**How to avoid:** Guard the sync to only run when the user hasn't selected an older conv, OR use `selectedConvId` pattern where the ID is stable across reloads and the conv object is found by ID.

**Warning signs:** Picker jumps back to "Conversa atual" immediately after a message is sent.

---

### Pitfall 2: `UseFormSubmitOptions` does not accept `data`

**What goes wrong:** `post(url, { data: ... })` causes TS2353 in Inertia v3.

**Why it happens:** Inertia v3 changed `UseFormSubmitOptions = Omit<VisitOptions, 'data'>` — data is part of the form state, not the submit call. [VERIFIED: node_modules/@inertiajs/core/types/types.d.ts line 448]

**How to avoid:** Call `setData(field, value)` (or `transform()`) before calling `post(url)`. The form's own data is automatically sent.

**Warning signs:** TS2353 error on `post()` call with object containing `data:` key.

---

### Pitfall 3: Local `PageProps` types conflict with global augmentation

**What goes wrong:** A component defines `interface PageProps { auth: { user: { role: string } } }` and passes it to `usePage<PageProps>()`. TypeScript reports TS2344 because the local type doesn't satisfy the global `PageProps` constraint (which requires `auth.organization`).

**Why it happens:** `global.d.ts` augments `@inertiajs/core`'s `PageProps`. `usePage<T>()` constrains `T extends PageProps`. Any local type missing a required field of the global `PageProps` fails the constraint.

**How to avoid:** After fixing `index.d.ts`, remove all local `PageProps` declarations and use `usePage<PageProps>().props` from the global import, or add the missing fields to the local declaration.

**Warning signs:** TS2344 with message "Types of property 'auth' are incompatible."

---

### Pitfall 4: OrgSwitcher closes before modal opens

**What goes wrong:** Clicking `+ Criar organização` closes the OrgSwitcher dropdown (via outside-click handler) before the modal state is set.

**Why it happens:** `orgSwitcherRef` outside-click handler fires on any click outside the ref. The modal is rendered outside the ref.

**How to avoid:** Set modal state before closing the dropdown, or render the modal inside the `orgSwitcherRef` container, or stop propagation on the button click.

**Warning signs:** Modal state never becomes `true`; dropdown closes and nothing else happens.

---

### Pitfall 5: GET SSE through useAiStream loses native reconnect

**What goes wrong:** If the GET SSE branch uses `fetch()` instead of `EventSource`, the browser's native reconnect behavior (automatic retry on connection drop, `Last-Event-ID` header) is lost.

**Why it happens:** `fetch()` does not implement the SSE reconnect spec. `EventSource` does.

**How to avoid:** The GET branch inside `useAiStream` MUST use `new EventSource(url, { withCredentials: true })` — not `fetch()`. The `cancel()` method stores `es.close` as the abort function.

**Warning signs:** Research timeline modal shows "Aguardando eventos…" indefinitely after a momentary network blip.

---

## Code Examples

### Creating an organization (backend)

```php
// Verified pattern from Organization model + organization_user migration
$org = Organization::create(['name' => $validated['name'], 'slug' => $validated['slug']]);
$org->users()->attach($user->id, [
    'role' => 'owner',
    'joined_at' => now(),
]);
$user->update(['current_organization_id' => $org->id]);
return redirect()->route('dashboard')->with('success', 'Organização criada.');
```

### Switching org after creation (frontend — already exists)

```typescript
// VERIFIED: AppLayout.tsx lines 219-222 — existing switchOrg pattern
router.patch(route('settings.current-org'), { organization_id: org.id });
```

After creating org via Inertia `router.post()`, the server redirect to `/dashboard` handles the switch automatically (server sets `current_organization_id` before redirect, Inertia re-shares auth props).

### useAiStream GET branch (new)

```typescript
// ASSUMED structure — Claude's discretion on internals
if (opts.method === 'GET') {
  const es = new EventSource(opts.url, { withCredentials: true });
  abortRef.current = { abort: () => es.close() } as AbortController;

  return new Promise<void>((resolve) => {
    es.addEventListener('status', (e: MessageEvent) => {
      try { opts.onEvent?.('status', JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('done', (e: MessageEvent) => {
      try { opts.onDone?.(e.data ? JSON.parse(e.data) : {}); } catch { opts.onDone?.({}); }
      setState('done');
      es.close();
      resolve();
    });
    es.onerror = () => {
      setState('error');
      setError('SSE connection error');
      opts.onError?.('SSE connection error');
      es.close();
      resolve();
    };
    setState('streaming');
  });
}
```

### Conversation picker dropdown (Claude's discretion)

```tsx
// Pattern consistent with OrgSwitcher in AppLayout.tsx
const [pickerOpen, setPickerOpen] = useState(false);
const pickerRef = useRef<HTMLDivElement>(null);

// Header:
<div ref={pickerRef} className="relative">
  <button onClick={() => setPickerOpen(v => !v)} className="flex items-center gap-1 ...">
    <span>{selectedLabel}</span>
    <ChevronDown size={12} />
  </button>
  {pickerOpen && (
    <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-[12px] border ... shadow-lg">
      {demand.conversations?.map(c => (
        <button key={c.id} onClick={() => { setSelectedConvId(c.id); setPickerOpen(false); }}
          className={`w-full px-4 py-2 text-left text-sm ... ${c.id === selectedConvId ? 'text-[#7c3aed]' : ''}`}
        >
          {convLabel(c)}
          {c.id === latestConv?.id && <Check size={12} className="shrink-0 text-[#7c3aed]" />}
        </button>
      ))}
    </div>
  )}
</div>
```

---

## Runtime State Inventory

> Rename/refactor: not applicable. This phase is feature addition + bug fixes.

None — no string renames, no migrated identifiers, no stored state affected.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | TypeScript compile | ✓ | (existing) | — |
| PHP 8.4 / Laravel 13 | Backend controller | ✓ | (existing) | — |
| PostgreSQL 17 | organizations table | ✓ | (existing) | — |

No new external dependencies. Step 2.6: All needed tools are present.

---

## Validation Architecture

> `workflow.nyquist_validation` not found in config.json (file absent) — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Pest PHP (Laravel default) + Vitest (if configured) |
| Config file | `phpunit.xml` / `vite.config.ts` |
| Quick run command | `php artisan test --filter OrganizationTest` |
| Full suite command | `php artisan test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MORG-01 | POST /organizations creates org + attaches owner pivot | Feature (PHP) | `php artisan test --filter OrganizationCreationTest` | ❌ Wave 0 |
| MORG-01 | Slug uniqueness validation returns error | Feature (PHP) | `php artisan test --filter OrganizationCreationTest` | ❌ Wave 0 |
| MORG-01 | Creator auto-switched to new org | Feature (PHP) | same | ❌ Wave 0 |
| POLISH-01 | useAiStream GET branch calls onEvent for 'status' | Unit (TS/Vitest) | `npx vitest run useAiStream` | ❌ Wave 0 |
| POLISH-02 | tsc --noEmit exits 0 | Type check | `npx tsc --noEmit` | ✅ (always runs) |
| POLISH-03 | Conversation picker renders all conversations | Manual/visual | — | manual only |

### Wave 0 Gaps

- [ ] `tests/Feature/OrganizationCreationTest.php` — covers MORG-01 (store + pivot + switch)
- [ ] TypeScript test for useAiStream GET branch is optional but recommended

*(TypeScript: `npx tsc --noEmit` as POLISH-02 gate — always available)*

---

## Open Questions

1. **Route name for new org creation**
   - What we know: No `POST /organizations` route exists. The `settings.` prefix group is for existing-org management.
   - Recommendation: Register as `Route::post('/organizations', [OrganizationController::class, 'store'])->name('organizations.store')` inside the `auth` middleware group (not the `settings.` prefix group).

2. **Slug uniqueness race condition**
   - What we know: Slug is `unique:organizations,slug` at DB level. Two users could theoretically slug-check the same name simultaneously.
   - Recommendation: Laravel validation handles this; return 422 with `errors.slug` via Inertia standard error handling. No extra work needed.

3. **`useEffect` sync guard for conversation picker**
   - What we know: The current `useEffect` always resets `conv` to latest. With a picker, this needs refinement.
   - Recommendation: Adopt `selectedConvId` integer state — on reload, `demand.conversations` updates but `selectedConvId` is sticky. Only reset `selectedConvId` to latest when user sends a message or creates a new conversation.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Slugify inline: `normalize('NFD').replace(/[̀-ͯ]/g, '')` for accent stripping | MORG-01 Code | Wrong regex could produce invalid slugs with accented chars — fix at code review |
| A2 | GET branch of useAiStream wraps EventSource in Promise-based structure as shown | POLISH-01 Code | Implementation detail only; Claude's discretion per D-11 / D-13 |
| A3 | `setData(field, value)` before `post(url)` is the correct Inertia v3 fix for the `data:` option in Clients/Edit | POLISH-02 | Alternatively `transform()` could be used; both are valid |

**All critical structural claims (routes, types, component code, error catalog) are VERIFIED against the codebase in this session.**

---

## Sources

### Primary (HIGH confidence — verified by direct file read)

- `resources/js/hooks/useAiStream.ts` — full implementation read; GET branch not implemented
- `resources/js/Components/ClientResearchTimelineModal.tsx` — EventSource block verified
- `resources/js/Components/ChatTab.tsx` — conv state management, header structure, demand.conversations[] usage
- `resources/js/Layouts/AppLayout.tsx` — OrgSwitcher with disabled stub button at lines 238-247
- `resources/js/types/index.d.ts` — current PageProps, User, AuthOrganization interfaces
- `resources/js/types/global.d.ts` — InertiaConfig module augmentation
- `app/Models/Organization.php` — fillable fields, relations, pivot attach pattern
- `app/Models/User.php` — currentOrganization, organizations(), getCurrentRoleAttribute()
- `app/Http/Controllers/Settings/SettingsController.php` — switchOrg pattern
- `app/Http/Middleware/HandleInertiaRequests.php` — exact server-side auth payload
- `routes/web.php` — confirmed no POST /organizations route exists
- `resources/js/Components/AiIcon.tsx` — size enum `12|16|20|24|32|48|64`
- `database/migrations/2026_04_23_300000_*` — organization_user pivot schema
- `npx tsc --noEmit` — 15 errors confirmed; full error list captured
- `node_modules/@inertiajs/core/types/types.d.ts` — `UseFormSubmitOptions = Omit<VisitOptions, 'data'>` at line 448

### Tertiary (LOW confidence)

- Slugify regex pattern — standard but not validated against project-specific requirements [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- MORG-01 (backend): HIGH — Organization model, pivot, switchOrg pattern all verified
- MORG-01 (frontend): HIGH — OrgSwitcher stub verified; modal pattern from existing components
- POLISH-01: HIGH — Both files read in full; protocol difference documented
- POLISH-02: HIGH — All 15 errors verified by `npx tsc --noEmit`; root cause confirmed in global.d.ts
- POLISH-03: HIGH — ChatTab read in full; demand.conversations shape confirmed

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable codebase; no fast-moving external dependencies)
