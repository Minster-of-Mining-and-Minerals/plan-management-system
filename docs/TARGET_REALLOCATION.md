# Target Reallocation

Controlled redistribution of **period targets** after execution has started. The **annual target stays unchanged**. This is not annual revision, carry-forward, or achievement adjustment.

## Permissions

| Permission | Allows |
|------------|--------|
| `PLAN:REQUEST_TARGET_REALLOCATION` | Create and cancel own pending requests on assigned KPIs |
| `PLAN:APPROVE_TARGET_REALLOCATION` | Approve / reject pending requests in assignment scope |

Scope matches achievement-style rules: sector + plan assignment on the KPI branch. Approvers are resolved from users with approve permission in that scope.

## Status workflow

`pending` → `applied` (approve auto-applies in one transaction)

`pending` → `rejected` | `cancelled`

Statuses are lowercase in the API/DB; UI may show uppercase labels.

## ID mapping

| Spec field | Codebase |
|------------|----------|
| `draftId` | Live `master_plan_version_id` |
| `kpiId` | Live **annual** KPI `plan_node_id` |
| `fromPeriodId` / `toPeriodId` | Live execution period `plan_version_id` |
| Apply targets | **Snapshot** period KPI nodes on the active execution snapshot |

## Validation rules

1. Amount must be **> 0**
2. Source and destination periods must be **different**
3. Both periods must belong to the **same KPI** (same annual year)
4. **Annual target** is never modified; period targets must continue to sum to it
5. Movable amount = `period_target − period_actual` (source)
6. Resulting period targets cannot go **negative**
7. Cannot reallocate **from** a finalized (`completed`) period; moving **into** future periods is allowed
8. Only available after master `process_started_at` is set

## Apply behavior

On approve (same DB transaction):

1. Re-validate movable amount against current snapshot targets/actuals
2. Update both snapshot `period_target` values
3. Write two `target_allocation_histories` rows (`change_type: reallocation`)
4. Set request status to `applied` with review audit fields
5. Leave `period_actual` and annual target untouched

## Original vs current target

At **Start Process**, period targets are captured into `plan_period_target_baselines`.

Reporting per period KPI node:

- **Original** — baseline at process start (falls back to current if missing)
- **Current** — live snapshot `period_target`
- **Reallocated out / in** — sums from allocation history
- **Net adjustment** — `current − original`

## Direct period-target edits

After execution has started, `PATCH /plan/nodes/:id/period-target` is blocked. Period target changes must go through Target Reallocation.

## APIs

| Method | Path | Permission |
|--------|------|------------|
| `POST` | `/api/plan/target-reallocations` | `REQUEST_TARGET_REALLOCATION` |
| `GET` | `/api/plan/target-reallocations` | Plan read (filtered list) |
| `POST` | `/api/plan/target-reallocations/:id/approve` | `APPROVE_TARGET_REALLOCATION` |
| `POST` | `/api/plan/target-reallocations/:id/reject` | `APPROVE_TARGET_REALLOCATION` |
| `POST` | `/api/plan/target-reallocations/:id/cancel` | Requester + pending |
| `GET` | `/api/plan/versions/:id/period-target-reallocation-reporting` | Plan read |

## Notifications

| Event | Recipients |
|-------|------------|
| Submitted | Approvers in scope |
| Approved / rejected | Requester |

Deep link: `/plans/{masterVersionId}?tab=hierarchy&focus=reallocation`

## UI

- **Target Reallocation** section on the hierarchy (after process start)
- Period achievement screens show **Originally** / **Adjustment** via reporting provider

## Out of scope

Annual target revision, carry-forward automation, org reassignment, automatic redistribution, cross-year moves.
