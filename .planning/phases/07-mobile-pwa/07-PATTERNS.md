# Phase 7: Mobile + PWA — Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 6 (5 modified + 1 verify-only)
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `resources/js/Layouts/AppLayout.tsx` | layout | request-response | self (existing file, single-class addition) | exact |
| `resources/js/Components/KanbanBoard.tsx` | component | event-driven | self (existing file, root div + column container classes) | exact |
| `resources/js/Components/DemandDetailModal.tsx` | component | event-driven | self (existing file, extensive responsive + animation additions) | exact |
| `public/manifest.json` | config | — | self (existing file, icons array restructure + id field) | exact |
| `resources/views/app.blade.php` | config | — | self (existing file, verify-only — no change expected) | exact |
| `resources/js/pages/Dashboard.tsx` | page | request-response | self (existing file, verify-only — already responsive) | exact |

---

## Pattern Assignments

### `resources/js/Layouts/AppLayout.tsx` (layout, D-07 / MOB-01)

**Change:** Add `overflow-x-hidden` to the outermost `<div>` (line 137).

**Current state — outermost div (line 137):**
```tsx
<div className="flex min-h-screen bg-[#f9fafb] dark:bg-[#0b0f14]" style={{ minHeight: '540px', minWidth: '360px' }}>
```

**Target state — add `overflow-x-hidden`:**
```tsx
<div className="flex min-h-screen overflow-x-hidden bg-[#f9fafb] dark:bg-[#0b0f14]" style={{ minHeight: '540px', minWidth: '360px' }}>
```

**Inner flex container (line 140) — already has `overflow-hidden`, must remain unchanged:**
```tsx
<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
```

**`<main>` (line 254) — already has `overflow-auto`, must remain unchanged:**
```tsx
<main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
```

**Bell button touch target (line 152-155) — UI-SPEC requires `min-h-[44px] min-w-[44px]` on mobile:**
```tsx
// Current:
className="relative flex h-8 w-8 items-center justify-center rounded-[8px] ..."
// Target — add responsive min touch target:
className="relative flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] ..."
```

---

### `resources/js/Components/KanbanBoard.tsx` (component, D-01 / MOB-02)

**Touch sensor — ALREADY CONFIGURED (line 176-177), no change needed:**
```tsx
useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
```

**Change 1 — root div (line 236): add `overflow-hidden` to create containing context.**

Current state (line 236):
```tsx
<div className="relative h-full w-full">
```

Target state:
```tsx
<div className="relative h-full w-full overflow-hidden">
```

**Change 2 — column strip (line 245): add responsive height so container does not collapse on mobile.**

Current state (line 245):
```tsx
<div className="flex h-full gap-4 overflow-x-auto kanban-scroll pb-2">
```

Target state:
```tsx
<div className="flex h-[calc(100dvh-8rem)] md:h-full gap-4 overflow-x-auto kanban-scroll pb-2">
```

**Column width (line 138) — fixed at `w-72`, intentional per D-01, do NOT change:**
```tsx
<div className="flex h-full w-72 shrink-0 flex-col">
```

---

### `resources/js/Components/DemandDetailModal.tsx` (component, D-03 / MOB-02)

This is the most complex change. Four distinct modifications are required.

**Change 1 — outer wrapper (line 208): change padding for full-bleed on mobile.**

Current state (line 208):
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" onClick={handleClose}>
```

Target state:
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6" onClick={handleClose}>
```

**Change 2 — modal panel (line 211): responsive full-screen classes + slide animation.**

Current state (line 211):
```tsx
<div
  className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[16px] bg-[#f9fafb] shadow-2xl dark:bg-[#0b0f14]"
  onClick={e => e.stopPropagation()}
>
```

Target state (responsive classes + transition):
```tsx
<div
  className="relative z-10 flex w-full flex-col overflow-hidden bg-[#f9fafb] shadow-2xl dark:bg-[#0b0f14]
             rounded-none md:rounded-[16px]
             h-[100dvh] md:h-auto
             max-h-[100dvh] md:max-h-[90vh]
             md:max-w-6xl
             transition-transform duration-[250ms] ease-out"
  onClick={e => e.stopPropagation()}
>
```

**Animation pattern — slide-up on mobile, none on desktop.** Use `useState` to drive enter/exit:

```tsx
// Add at top of component alongside existing useState calls:
const [visible, setVisible] = useState(false);

useEffect(() => {
  // Trigger enter animation on mount
  const raf = requestAnimationFrame(() => setVisible(true));
  return () => cancelAnimationFrame(raf);
}, []);

const handleClose = () => {
  // Existing dirty-check logic wraps this:
  if (isDirty) { setConfirmClose(true); return; }
  triggerClose();
};

const triggerClose = () => {
  setVisible(false);
  // Wait for exit animation before calling onClose
  setTimeout(onClose, 200);
};
```

The modal panel div gets `translate-y-full md:translate-y-0` when `!visible` and `translate-y-0` when `visible`:
```tsx
// Append to className above:
`${visible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`
```

**Change 3 — swipe handle: insert as first child inside modal panel div, before the header.**

Insert after line 212 (`onClick={e => e.stopPropagation()}`):
```tsx
{/* Swipe-down-to-close handle — mobile only */}
<div
  className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-[#374151] dark:bg-[#d1d5db] shrink-0 z-10"
  aria-label="Arrastar para fechar"
  role="presentation"
/>
```

**Change 4 — swipe gesture handler: attach `onTouchStart`/`onTouchMove` to the modal panel div.**

```tsx
// Add ref and touch state alongside existing refs:
const touchStartY = useRef<number | null>(null);

// Handler to add to the modal panel div:
onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
onTouchMove={(e) => {
  if (touchStartY.current === null) return;
  const delta = e.touches[0].clientY - touchStartY.current;
  if (delta > 80) {
    touchStartY.current = null;
    triggerClose();
  }
}}
```

**Existing close button (line 275) — keep as-is, it is the primary mobile close action:**
```tsx
<button onClick={handleClose} className="rounded-[8px] p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#6b7280] transition-colors dark:hover:bg-[#1f2937]">
  <X size={18} />
</button>
```

**Existing body grid (line 282) — already responsive, do NOT change:**
```tsx
<div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-2">
```

**Existing confirm-close overlay (line 494) — uses `rounded-[16px]` on the inner card; on mobile modal is `rounded-none` but the overlay inner card stays rounded (correct, it floats above content):**
```tsx
<div className="mx-4 w-full max-w-sm rounded-[14px] bg-white p-6 shadow-2xl dark:bg-[#111827]">
```

---

### `public/manifest.json` (config, D-05 / MOB-03)

**Current state (complete file, lines 1-15):**
```json
{
  "name": "Briefy",
  "short_name": "Briefy",
  "description": "Gestão de demandas para agências com IA",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0b0f14",
  "theme_color": "#7c3aed",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

**Target state — two changes:**
1. Split each `"any maskable"` entry into two separate entries (non-standard combined value).
2. Add `"id": "/dashboard"` field (Chrome installability recommendation).

```json
{
  "name": "Briefy",
  "short_name": "Briefy",
  "description": "Gestão de demandas para agências com IA",
  "id": "/dashboard",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0b0f14",
  "theme_color": "#7c3aed",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

### `resources/views/app.blade.php` (config, D-05 / MOB-03) — VERIFY ONLY

**Current state (complete file, lines 1-35) — all required PWA tags already present:**

| Tag | Line | Status |
|-----|------|--------|
| `<meta name="viewport" ...>` | 5 | Present — `width=device-width, initial-scale=1` |
| `<meta name="theme-color" content="#7c3aed">` | 10 | Present |
| `<meta name="apple-mobile-web-app-capable" content="yes">` | 11 | Present |
| `<meta name="apple-mobile-web-app-status-bar-style" content="default">` | 12 | Present |
| `<meta name="apple-mobile-web-app-title" content="Briefy">` | 13 | Present |
| `<link rel="manifest" href="/manifest.json">` | 17 | Present |
| Service worker registration script | 18-21 | Present |

**No changes needed.** Executor must verify these lines are intact; no edits required this phase.

---

### `resources/js/pages/Dashboard.tsx` (page, D-04 / MOB-02) — VERIFY ONLY

**Responsive grid classes found in file:**

| Grid | Line | Classes | Mobile result |
|------|------|---------|---------------|
| Status cards | 323 | `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` | 2 columns — acceptable per UI-SPEC |
| Main 3-col | 334 | `grid-cols-1 md:grid-cols-3` | 1 column on mobile |
| Charts | 397 | `grid-cols-1 lg:grid-cols-2` | 1 column on mobile |
| Status cards (repeat) | 534 | `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` | 2 columns |
| Main 3-col (repeat) | 541 | `grid-cols-1 md:grid-cols-3` | 1 column on mobile |
| Charts (repeat) | 603 | `grid-cols-1 lg:grid-cols-2` | 1 column on mobile |

**No changes needed.** All grids already collapse correctly per UI-SPEC. Executor must verify no individual card uses a fixed pixel width that bleeds past 375px during browser testing.

---

## Shared Patterns

### Breakpoint convention
**Source:** `resources/js/Components/BottomNav.tsx` (established `md:hidden` pattern)
**Apply to:** All Phase 7 responsive additions
```tsx
// Mobile-only: show below md
className="... md:hidden"
// Desktop-only: show at md and above
className="hidden md:flex ..."
// Responsive value: different value per breakpoint
className="... h-[calc(100dvh-8rem)] md:h-full"
```
Use `md:` (768px) as the single mobile/desktop boundary. Do not introduce `sm:` for new mobile-specific rules.

### Dark mode pattern
**Source:** All existing components — manual Tailwind tokens
**Apply to:** Swipe handle visual spec
```tsx
// Light/dark token pairs used in this project:
bg-[#374151] dark:bg-[#d1d5db]   // swipe handle color per UI-SPEC
bg-white dark:bg-[#111827]        // surface (header, cards)
bg-[#f9fafb] dark:bg-[#0b0f14]   // page/modal background
text-[#111827] dark:text-[#f9fafb] // primary text
```

### No-scrollbar utility
**Source:** `resources/js/Components/DemandDetailModal.tsx` (line 285, 360, 422)
**Apply to:** Any overflow-y-auto container inside the full-screen modal
```tsx
className="overflow-y-auto no-scrollbar"
```

### Transition pattern for show/hide
**Source:** `resources/js/Components/KanbanBoard.tsx` — TrashZone/ArchiveZone (lines 30-33)
**Apply to:** Modal slide animation
```tsx
// Existing pattern (opacity + scale):
className={`... transition-all duration-200 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}

// Modal slide pattern (translate-y):
className={`... transition-transform duration-[250ms] ease-out ${visible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}
```

### Outside-click handler pattern
**Source:** `resources/js/Layouts/AppLayout.tsx` (lines 90-96, 99-107)
**Apply to:** Any new interactive overlay
```tsx
const ref = useRef<HTMLDivElement>(null);
useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, []);
```

---

## No Analog Found

All files have direct self-analogs (they are existing files being modified). No files require pattern research from external sources.

---

## Metadata

**Analog search scope:** `resources/js/Layouts/`, `resources/js/Components/`, `resources/js/pages/`, `public/`, `resources/views/`
**Files read:** 7 (AppLayout.tsx, KanbanBoard.tsx, DemandDetailModal.tsx, manifest.json, app.blade.php, Dashboard.tsx, 07-CONTEXT.md, 07-UI-SPEC.md)
**Pattern extraction date:** 2026-04-24
