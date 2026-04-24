---
phase: 09-notifications-system
verified: 2026-04-24T19:30:00Z
status: human_needed
score: 9/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Badge incrementa sem refresh de página via WebSocket"
    expected: "Com dois navegadores abertos e php artisan reverb:start rodando — quando o Usuário B atribui uma demanda ao Usuário A, o sino do Usuário A incrementa sem qualquer reload de página"
    why_human: "Requer servidor Reverb ativo e dois contextos de autenticação simultâneos — não verificável via grep/análise estática"
  - test: "Notificação aparece no dropdown após incremento do badge"
    expected: "Após o badge incrementar (via Echo), o Usuário A clica no sino e a nova notificação aparece imediatamente na lista (sem reload de página)"
    why_human: "O dropdown busca notificações em openBell() — verificar que a notificação já está no banco quando o usuário abre requer execução real"
  - test: "Clicar numa notificação navega para a demanda correta"
    expected: "Clicar numa notificação do tipo demand_assigned ou demand_status_changed navega para /demands?demand={id} e abre o modal da demanda correspondente"
    why_human: "Requer navegação real no browser — verificação de rota parametrizada não confirmável via análise estática"
---

# Phase 9: Notifications System — Verification Report

**Phase Goal:** Users receive in-app notifications in real-time when demands are assigned or change status, and can manage them from the bell dropdown.
**Verified:** 2026-04-24T19:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (PLAN 09-01)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When assigned_to changes, a BriefyNotification record exists for the new assignee | VERIFIED | `DemandController::updateInline` creates `BriefyNotification` before dispatching `DemandAssigned::dispatch()` (lines 274-289) |
| 2 | When actor === new assignee, no BriefyNotification is created (D-04) | VERIFIED | Guard: `$demand->assigned_to !== auth()->id()` at line 272 |
| 3 | When assigned_to is null, no notification is created (D-03) | VERIFIED | Guard: `$demand->assigned_to` (truthy check) at line 270 |
| 4 | When status changes, BriefyNotification records exist for each of creator and assignee (excluding actor) | VERIFIED | `dispatchStatusChangedNotifications` iterates `$recipients` collect chain (lines 323-349) |
| 5 | When creator === assignee on a status change, exactly one notification is created (not two) | VERIFIED | `->unique()` at end of recipient chain (line 326) |
| 6 | DemandAssigned event is dispatched on assignment change | VERIFIED | `DemandAssigned::dispatch(...)` at line 282 |
| 7 | DemandStatusChanged event is dispatched on status change | VERIFIED | `DemandStatusChanged::dispatch(...)` at line 342 |
| 8 | GET /notifications returns only the authenticated user's own notifications | VERIFIED | Route closure scopes query: `->where('user_id', auth()->id())` (web.php line 164) |
| 9 | POST /notifications/{id}/read marks read_at; returns 403 for another user's notification | VERIFIED | `abort_if($notification->user_id !== auth()->id(), 403)` before update (web.php lines 167-171) |
| 10 | POST /notifications/read-all marks all unread as read for the current user | VERIFIED | `->where('user_id', auth()->id())->whereNull('read_at')->update(['read_at' => now()])` (web.php lines 172-176) |

**Score (Plan 01):** 10/10 truths verified

### Observable Truths (PLAN 09-02)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The 30-second setInterval polling block is removed from AppLayout.tsx | VERIFIED | `grep "setInterval" AppLayout.tsx` → 0 matches |
| 2 | A useEffect subscribes to '.notification.created' on the org channel via window.Echo.private() | VERIFIED | Lines 64-83: `window.Echo.private(\`organization.${orgId}\`)` + `.listen('.notification.created', ...)` |
| 3 | Echo callback filters by event.user_id === auth.user.id before incrementing (D-07) | VERIFIED | Line 72: `if (event.user_id !== auth.user.id) return;` |
| 4 | Bell badge reads from local unreadCount state, not directly from unread_notifications Inertia prop | VERIFIED | Lines 181-184: `{unreadCount > 0 && ...}` / `{unreadCount > 9 ? '9+' : unreadCount}` |
| 5 | markAllRead() calls setUnreadCount(0) instead of router.reload (D-08) | VERIFIED | Line 145: `setUnreadCount(0);` — no `router.reload` call anywhere in the function |
| 6 | handleNoteClick() calls setUnreadCount(prev => Math.max(0, prev - 1)) instead of router.reload (D-08) | VERIFIED | Line 152: `setUnreadCount(prev => Math.max(0, prev - 1));` |
| 7 | handleNoteClick() navigates to route('demands.index', { demand: note.data.demand_id }) not route('planejamento.index') | VERIFIED | Line 156: `router.visit(route('demands.index', { demand: note.data.demand_id }))` |
| 8 | Echo cleanup uses channel.stopListening('.notification.created') NOT window.Echo.leave() (D-10) | VERIFIED | Line 81: `channel.stopListening('.notification.created');` — `window.Echo.leave` appears only in a comment |
| 9 | NotificationCreatedEvent TypeScript interface is defined in AppLayout.tsx with snake_case user_id | VERIFIED | Lines 22-28: interface with `user_id: number` (snake_case) |

**Score (Plan 02):** 9/9 truths verified

### ROADMAP Success Criteria

| # | Success Criterion | Status | Evidence |
|---|------------------|--------|----------|
| SC-1 | A user assigned to a demand sees a notification appear in the bell dropdown without refreshing the page | HUMAN NEEDED | Backend creates BriefyNotification + dispatches Echo event confirmed. Badge increments locally via Echo (no reload). Dropdown shows notification when opened (fetch on openBell). Whether SC requires notification to appear while dropdown is already open requires live UAT. |
| SC-2 | The bell badge count updates live via WebSocket when a new notification arrives | HUMAN NEEDED | Code is correctly wired: Echo callback → setUnreadCount(prev + 1). Requires Reverb running to confirm live delivery. |
| SC-3 | User can mark all notifications as read and the badge clears immediately | VERIFIED | `markAllRead()` calls `setUnreadCount(0)` synchronously after `fetch()` — badge clears without reload |
| SC-4 | Notification shows demand title, event type, and timestamp | VERIFIED | Bell dropdown renders `note.title`, `note.body`, `note.created_at` (lines 210-214 AppLayout.tsx); BriefyNotification stores `type`, `title`, `body` |
| SC-5 | Clicking a notification navigates to the relevant demand | VERIFIED (code) + HUMAN | Code: `router.visit(route('demands.index', { demand: note.data.demand_id }))` is present. Navigation behavior needs browser UAT. |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/Events/DemandAssigned.php` | Broadcast event for assignment notifications | VERIFIED | Implements `ShouldBroadcastNow`, `broadcastAs()` returns `'notification.created'`, `PrivateChannel("organization.{orgId}")`, snake_case constructor props |
| `app/Events/DemandStatusChanged.php` | Broadcast event for status change notifications | VERIFIED | Identical structure to DemandAssigned, same broadcastAs, same channel pattern |
| `app/Http/Controllers/DemandController.php` | Controller with notification dispatch in updateInline + updateStatus | VERIFIED | `dispatchStatusChangedNotifications` declared + called from both update methods (3 occurrences); all imports present |
| `tests/Feature/NotificationDeliveryTest.php` | Feature test suite covering RT-03 through RT-07 (12 tests) | VERIFIED | 12 test methods with real assertions — no `markTestIncomplete` stubs remain |
| `resources/js/layouts/AppLayout.tsx` | AppLayout with Echo subscription replacing 30s polling | VERIFIED | Polling removed, Echo subscription at lines 64-83, all 8 planned changes confirmed |
| `database/factories/BriefyNotificationFactory.php` | Factory for test setup | VERIFIED | All fillable fields covered; `read_at` defaults to null |
| `app/Models/BriefyNotification.php` | Model with HasFactory trait | VERIFIED | `use HasFactory;` present |
| `app/Http/Middleware/HandleInertiaRequests.php` | unread_notifications shared prop | VERIFIED | `BriefyNotification::where('user_id', $user->id)->whereNull('read_at')->count()` at line 83 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DemandController::updateInline | DemandAssigned::dispatch | old/new assigned_to comparison | WIRED | `$demand->assigned_to !== $oldAssignedTo` guard + dispatch at line 282 |
| DemandController::updateStatus | dispatchStatusChangedNotifications | old/new status comparison | WIRED | `$oldStatus = $demand->status` before update; dispatch call at line 309 |
| DemandController::updateInline | dispatchStatusChangedNotifications | old/new status comparison | WIRED | `$oldStatus` captured at line 263; dispatch call at line 293 |
| DemandAssigned/DemandStatusChanged | private-organization.{orgId} | PrivateChannel + ShouldBroadcastNow | WIRED | Both event classes broadcast on `PrivateChannel("organization.{$this->organization_id}")` |
| AppLayout Echo useEffect | window.Echo.private(`organization.${orgId}`) | auth.organization?.id | WIRED | Line 68: `window.Echo.private(\`organization.${orgId}\`)` |
| Echo callback | setUnreadCount(prev => prev + 1) | filter event.user_id === auth.user.id | WIRED | Lines 72-75: filter guard + setUnreadCount call |
| cleanup return | channel.stopListening('.notification.created') | NOT window.Echo.leave() | WIRED | Line 81: `channel.stopListening('.notification.created')` |
| routes/channels.php | organization.{orgId} auth | current_organization_id === orgId | WIRED | `(int) $user->current_organization_id === (int) $orgId` |
| GET /notifications | BriefyNotification query scoped to user | auth()->id() | WIRED | `->where('user_id', auth()->id())` in route closure |
| POST /notifications/{id}/read | 403 guard | user_id === auth()->id() | WIRED | `abort_if($notification->user_id !== auth()->id(), 403)` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| AppLayout.tsx bell badge | `unreadCount` | Initialized from `unread_notifications` (Inertia prop from HandleInertiaRequests DB query); incremented by Echo events | Yes — DB count on load + Echo increments on new notifications | FLOWING |
| AppLayout.tsx bell dropdown list | `notes` | Fetched via `GET /notifications` in `openBell()` → `BriefyNotification::where('user_id', auth()->id())->orderByDesc('created_at')->limit(20)->get()` | Yes — real DB query, scoped to user, ordered | FLOWING |
| `unread_notifications` Inertia prop | shared prop | `BriefyNotification::where('user_id', $user->id)->whereNull('read_at')->count()` in HandleInertiaRequests | Yes — real DB count | FLOWING |

---

## Behavioral Spot-Checks

Runnable checks without a live server:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| DemandAssigned exists and implements ShouldBroadcastNow | `grep "ShouldBroadcastNow" app/Events/DemandAssigned.php` | 1 match | PASS |
| DemandStatusChanged broadcastAs returns 'notification.created' | `grep "notification.created" app/Events/DemandStatusChanged.php` | 1 match | PASS |
| dispatchStatusChangedNotifications called from both update methods | Count in DemandController.php | 3 occurrences (2 call sites + 1 declaration) | PASS |
| oldAssignedTo captured before update | `grep "oldAssignedTo = \$demand->assigned_to"` | Line 262 (before line 265 update) | PASS |
| setInterval polling removed | `grep "setInterval" AppLayout.tsx` | 0 matches | PASS |
| window.Echo.leave not called functionally | `grep "window\.Echo\.leave" AppLayout.tsx` | 0 functional matches (only in comment) | PASS |
| stopListening cleanup present | `grep "stopListening.*notification.created" AppLayout.tsx` | 1 match at line 81 | PASS |
| Badge reads local state not Inertia prop | `grep "unread_notifications" AppLayout.tsx (JSX)` | Only in destructure + useState init (lines 36-37); not in JSX | PASS |
| NotificationCreatedEvent interface defined | `grep "NotificationCreatedEvent" AppLayout.tsx` | 2 matches (definition + usage) | PASS |
| Navigation fixed from planejamento to demands | `grep "planejamento.index" AppLayout.tsx` | 0 matches | PASS |

Step 7b: Behavioral spot-checks on the running test suite cannot be executed without a PostgreSQL environment with `psql` in PATH (pre-existing infrastructure issue documented in 09-01-SUMMARY.md). Code analysis confirms all 12 test methods have real assertions.

---

## Requirements Coverage

| REQ-ID | Source Plan | Description | Status | Evidence |
|--------|------------|-------------|--------|----------|
| RT-03 | 09-01 | User receives in-app notification when a demand is assigned to them | SATISFIED | `DemandController::updateInline` creates `BriefyNotification` + dispatches `DemandAssigned` on assignment change with null-guard and self-notification guard |
| RT-04 | 09-01 | User receives in-app notification when status of a demand they own changes | SATISFIED | `dispatchStatusChangedNotifications` creates notifications for creator + assignee (excluding actor) on status change from both `updateStatus` and `updateInline` |
| RT-05 | 09-01 + 09-02 | Notification bell shows unread badge count that updates in real-time via WebSocket | SATISFIED (code) + HUMAN | Echo subscription in AppLayout.tsx increments `unreadCount` locally on `.notification.created` events addressed to current user; requires Reverb for live confirmation |
| RT-06 | 09-02 | User can open dropdown from bell icon and see recent notifications with timestamp and demand context | SATISFIED | `openBell()` fetches `GET /notifications` (last 20, scoped to user); dropdown renders `note.title`, `note.body`, `note.type`, `note.created_at` |
| RT-07 | 09-02 | User can mark individual or all notifications as read | SATISFIED | `POST /notifications/read-all` marks all; `POST /notifications/{id}/read` marks single with 403 guard; both reflected locally via `setUnreadCount` without reload |

All 5 requirement IDs from PLAN frontmatter (RT-03 through RT-07) are covered. Cross-reference with REQUIREMENTS.md confirms these are the only Phase 9 requirements. No orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No blocking anti-patterns found | — | — | — | — |

Scanned artifacts: `DemandAssigned.php`, `DemandStatusChanged.php`, `DemandController.php`, `AppLayout.tsx`, `NotificationDeliveryTest.php`, `BriefyNotificationFactory.php`.

Notable observations (non-blocking):
- `AppLayout.tsx` line 79: Comment mentions `window.Echo.leave()` as a warning — confirmed it is NOT called in functional code. Safe.
- `DemandController.php` `dispatchStatusChangedNotifications`: The chained `.filter()` calls appear on separate lines (not inline chaining) which matches the plan's intent but means the acceptance criterion `->filter()->filter(` pattern matching requires checking across lines. Logic is functionally correct.

---

## Human Verification Required

### 1. Badge incrementa em tempo real via WebSocket

**Test:** Abrir a app como Usuário A em aba normal + Usuário B em aba anônima. Com `php artisan reverb:start` rodando, como Usuário B: abrir Demandas e atribuir uma demanda ao Usuário A.
**Expected:** O sino do Usuário A incrementa o badge sem qualquer reload de página ou XHR para `/demands`.
**Why human:** Requer Reverb WebSocket ativo + dois contextos de sessão simultâneos.

### 2. Notificação aparece no dropdown com contexto correto

**Test:** Após o badge incrementar (passo anterior), Usuário A clica no sino.
**Expected:** A nova notificação aparece com o título da demanda (note.title = "Demanda atribuída a você"), o body com o nome da demanda, e um timestamp. Badge do sino some após "Marcar todas como lidas".
**Why human:** Requer renderização real no browser para confirmar que `note.title`, `note.body`, e `note.created_at` renderizam corretamente.

### 3. Navegação ao clicar numa notificação

**Test:** Usuário A clica numa notificação de demanda.
**Expected:** Navega para `/demands?demand={id}` e o modal da demanda correta abre.
**Why human:** `router.visit(route('demands.index', { demand: note.data.demand_id }))` — confirmar que o `demand_id` no payload está correto e o modal abre via parâmetro de rota.

### 4. Ausência de polling na aba Network

**Test:** Abrir DevTools → Network → filtrar XHR/Fetch → aguardar 35 segundos.
**Expected:** Nenhuma requisição automática a `/demands` ou `/notifications` aparece por polling.
**Why human:** Verificação de ausência de comportamento não-intencional — requer observação em tempo real.

---

## Gaps Summary

Nenhum gap bloqueador identificado. Todos os artefatos obrigatórios existem, são substantivos e estão conectados. A lógica do backend e do frontend implementa corretamente os requisitos RT-03 a RT-07 conforme especificado nos planos.

O status `human_needed` reflete que os critérios de sucesso do ROADMAP envolvendo comportamento WebSocket em tempo real (SC-1, SC-2) requerem verificação com Reverb ativo + dois browsers, o que não é verificável via análise estática.

---

_Verified: 2026-04-24T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
