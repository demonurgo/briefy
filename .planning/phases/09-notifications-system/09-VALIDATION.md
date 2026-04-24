---
phase: 9
slug: notifications-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PHPUnit (Laravel 13 built-in) |
| **Config file** | `phpunit.xml` |
| **Quick run command** | `php artisan test --filter NotificationDeliveryTest` |
| **Full suite command** | `php artisan test` |
| **Estimated runtime** | ~5–10 seconds (feature tests, no Reverb required — uses Event::fake) |

---

## Sampling Rate

- **After every task commit:** Run `php artisan test --filter NotificationDeliveryTest`
- **After every plan wave:** Run `php artisan test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | RT-03 | — | Notification only to assignee, never actor, never null assignee | Feature (PHPUnit) | `php artisan test --filter NotificationDeliveryTest::test_notification_created_on_assignment` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | RT-04 | — | Notification to creator+assignee, excluding actor, deduped if same | Feature (PHPUnit) | `php artisan test --filter NotificationDeliveryTest::test_notification_created_for_creator_on_status_change` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | RT-03 | — | No notification when assignee is null (D-03) | Feature (PHPUnit) | `php artisan test --filter NotificationDeliveryTest::test_no_notification_when_no_assignee` | ❌ W0 | ⬜ pending |
| 9-01-04 | 01 | 1 | RT-03,RT-04 | — | No self-notification — actor excluded from recipients (D-04) | Feature (PHPUnit) | `php artisan test --filter NotificationDeliveryTest::test_no_self_notification_on_assignment` | ❌ W0 | ⬜ pending |
| 9-01-05 | 01 | 1 | RT-06 | — | GET /notifications returns last 20 for current user only | Feature (PHPUnit) | `php artisan test --filter NotificationDeliveryTest::test_get_notifications_returns_user_notifications` | ❌ W0 | ⬜ pending |
| 9-01-06 | 01 | 1 | RT-07 | — | POST /notifications/{id}/read marks as read; 403 for other user | Feature (PHPUnit) | `php artisan test --filter NotificationDeliveryTest::test_mark_single_notification_as_read` | ❌ W0 | ⬜ pending |
| 9-01-07 | 01 | 1 | RT-07 | — | POST /notifications/read-all marks all unread for current user | Feature (PHPUnit) | `php artisan test --filter NotificationDeliveryTest::test_mark_all_notifications_as_read` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 2 | RT-05 | — | Badge count accurate in Inertia shared props | Feature (PHPUnit) | `php artisan test --filter NotificationDeliveryTest::test_unread_count_shared_in_inertia_props` | ❌ W0 | ⬜ pending |
| 9-02-02 | 02 | 2 | RT-05,RT-06 | — | Real-time Echo badge update (manual only — requires Reverb) | Manual | See Manual-Only section | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/NotificationDeliveryTest.php` — stubs for RT-03 through RT-07
  - Use `Event::fake([DemandAssigned::class, DemandStatusChanged::class])` for broadcast assertions
  - Use `BriefyNotification::count()` or `assertDatabaseHas('briefy_notifications', [...])` for persistence assertions
  - Covers: assignment, status change, self-notification guard, null assignee guard, mark-as-read, read-all, 403 authorization

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bell badge increments instantly on Echo event | RT-05 | Requires running Reverb WebSocket server + two browser sessions | 1. Open app as User A. 2. Open app as User B in another browser. 3. User B assigns demand to User A. 4. Verify User A's bell badge increments without page refresh. |
| setInterval removed (no polling) | RT-05 | Network tab verification | Open DevTools Network tab, wait 35s, confirm no XHR reload requests appear |
| Bell dropdown shows new notification | RT-06 | Requires running Reverb | After badge increments, open bell dropdown → verify notification appears with title + timestamp |
| Click notification navigates to demand | RT-06 | Navigation behavior | Click notification → verify URL changes to demands page with correct demand opened |
| Mark all read clears badge immediately | RT-07 | Frontend state behavior | Open bell, click "Mark all read" → badge clears to 0 without page reload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
