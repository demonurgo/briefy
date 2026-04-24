---
phase: 5
reviewers: [codex]
reviewed_at: 2026-04-23T00:00:00Z
plans_reviewed:
  - 05-00-PLAN.md
  - 05-01-PLAN.md
  - 05-02-PLAN.md
  - 05-03-PLAN.md
  - 05-04-PLAN.md
---

# Cross-AI Plan Review — Phase 5: Dashboard + Onboarding

## Codex Review

**Summary**
I'd rate the plan as broadly sound, with two changes I would make before execution: add the `activity_logs` indexes in Wave 0, and move `ActivityLog` model creation out of the parallel path. The largest functional gap is `demand.comment_added`, because current comments are created directly in DemandController.php, so a `DemandObserver` will not see them.

**Strengths**
- Good wave shape overall: migrations/dependencies/tests first, backend data contract before React rebuild.
- Server-side role gating for overview data is the right security boundary.
- Eager loading `activityFeed->with('user:id,name,avatar')` avoids the obvious feed N+1.
- Raw aggregate queries for dashboard charts are appropriate; Eloquent is not required for workload metrics.

**Concerns**

| Severity | Concern | Detail |
|---|---|---|
| HIGH | Missing `activity_logs` indexes | Dashboard feed hits `organization_id + created_at` constantly, and collaborator-scoped feed needs a polymorphic subject index. Cheap before production data, painful later. |
| HIGH | `demand.comment_added` not implemented | Enum support without a creation path is a DASH-05 coverage gap. Comments are created in DemandController directly (not via Demand model update), so DemandObserver never sees them. Need a DemandCommentObserver. |
| MEDIUM-HIGH | Parallel dependency on ActivityLog | 05-02 depends on `App\Models\ActivityLog` created in parallel 05-01 — avoidable execution risk. Move `ActivityLog` model to Wave 0. |
| MEDIUM | Dashboard.tsx size (~1000 lines) | Acceptable for first rebuild but not final shape. Split PersonalView, OverviewView, chart primitives after data contract stabilizes. |
| MEDIUM | Red test discipline | Tests must fail by assertion, not by missing classes. If Wave 0 tests need ActivityLog, ensure the model is available (fixed by moving it to Wave 0). |
| LOW-MEDIUM | PostgreSQL TO_CHAR day abbreviations | Locale-sensitive and not portable to SQLite. Prefer `EXTRACT(DOW)` and map labels in PHP/JS. Not blocking for a PostgreSQL-only app. |
| LOW-MEDIUM | Activity feed reload cost | Without indexes this becomes a real issue. Later consider lazy/deferred prop. |
| LOW | Security double gate | Server-side `overview = null` for collaborators is sufficient. Client role check is UX only. Ensure all admin aggregates are conditionally computed server-side. |
| LOW | Completed-by-day with updated_at | Using `updated_at` as completion date can drift if completed items are edited. |
| LOW | Team workload zero-workload users | Raw JOIN only returns users with assigned demands — zero-workload team members not shown. |

**Suggestions**
- Add indexes: `activity_logs(organization_id, created_at)` and `activity_logs(subject_type, subject_id)`
- Move `ActivityLog.php` model to Wave 0; keep observers in Wave 1
- Add `DemandCommentObserver` for `demand.comment_added` (DemandComment model, not Demand)
- Prefer `EXTRACT(DOW)` from SQL + label mapping in PHP over `TO_CHAR` day names

**Risk Assessment**
MEDIUM → LOW after fixes. Main risks are execution ordering (ActivityLog parallel dependency) and one missing event path (demand.comment_added). With indexes and the ActivityLog dependency moved earlier, Phase 5 is low-to-medium risk.

---

## Consensus Summary (1 reviewer)

### Key Strengths
- Wave dependency structure is sound (setup → backend → frontend)
- Server-side role gating (overview null for collaborators) is correct security model
- Eager loading strategy avoids N+1 on activity feed

### Issues Requiring Plan Updates
1. **[HIGH] Add indexes to activity_logs migration** → Fixed in 05-00
2. **[HIGH] demand.comment_added gap** → Fixed by adding DemandCommentObserver in 05-02
3. **[MEDIUM-HIGH] ActivityLog model parallel risk** → Fixed by moving model to 05-00

### Accepted (no plan change)
- Dashboard.tsx size: acceptable for first rebuild
- PostgreSQL TO_CHAR: app is PostgreSQL-only, risk is low
- Zero-workload team members: out of scope for this phase

---

*Review completed: 2026-04-23*
*Incorporado via: /gsd-plan-phase 5 --reviews*
