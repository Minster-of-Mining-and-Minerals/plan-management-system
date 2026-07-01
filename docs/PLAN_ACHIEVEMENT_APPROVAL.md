# Plan Achievement Approval Workflow

This document describes the permission-based achievement workflow for execution periods (after **Start Process**).

## Roles & permissions

| Permission | Role | Allows |
|------------|------|--------|
| `PLAN:EXECUTE_ACHIEVEMENT` | Executor | Set **period target** and **submit achievement** on assigned **leaf** nodes |
| `PLAN:APPROVE_ACHIEVEMENT` | Approver | **Approve** or **reject** submitted achievements in assignment scope |

Notes:

- `PLANS:APPROVE` is separate — it gates plan **version lifecycle** (status changes), not KPI achievement.
- `PLANS:EXECUTE_PLAN` was removed; use the permissions above.
- A user may hold **both** permissions but must **submit** and **approve** as two separate audited actions.

## Assignment scope

Both roles require:

1. User's **sector** matches an external assignment on the plan branch.
2. User is linked via **department** or **direct user** internal assignment on the relevant master-plan nodes.

**Executor** — assigned on the **leaf** KPI node only.

**Approver** — assigned on **any ancestor** (goal, strategic focus, etc.); can approve all pending submissions under that anchor.

## Achievement lifecycle (per leaf KPI, per open period)

| Status | Meaning | Rollup |
|--------|---------|--------|
| `empty` | Not submitted | Does not count |
| `submitted` | Awaiting approval | Counts only if **no approval gate** on path |
| `approved` | Approver accepted | Counts in parent rollup |
| `rejected` | Approver rejected | Does not count; executor may resubmit |

## Approval gate & rollup

Walk from leaf up the **master plan** tree. If any ancestor has an assigned approver (`PLAN:APPROVE_ACHIEVEMENT` + assignment + sector):

- Submitted values **do not** roll up until **approved**.
- Parent progress % updates only after approval.

If **no approver** exists on the path:

- Submitted values count immediately (no gate).

Parent nodes without manual override always show **rolled-up** achievement from eligible children.

## API endpoints

| Method | Path | Permission |
|--------|------|------------|
| `PATCH` | `/api/plan/nodes/:id/period-target` | `PLAN:EXECUTE_ACHIEVEMENT` |
| `POST` | `/api/plan/nodes/:id/achievement/submit` | `PLAN:EXECUTE_ACHIEVEMENT` |
| `POST` | `/api/plan/nodes/:id/achievement/approve` | `PLAN:APPROVE_ACHIEVEMENT` |
| `POST` | `/api/plan/nodes/:id/achievement/reject` | `PLAN:APPROVE_ACHIEVEMENT` |
| `PATCH` | `/api/plan/nodes/:id/period-actual` | `EXECUTE_ACHIEVEMENT` or `OVERRIDE_PARENT_ACHIEVEMENT` (legacy/override) |

All mutations are audited in `system_audit_logs` (`achievement_target_set`, `achievement_submitted`, `achievement_approved`, `achievement_rejected`).

## How to approve (user guide)

### As executor

1. Open the **open execution period** (`Plans → annual year → Q1/Q2/…`).
2. Navigate to an **assigned leaf KPI** with a period target.
3. Set **period target** (if not set) → **Save**.
4. Enter **achievement** → **Submit** (or **Resubmit** after rejection).
5. Status shows **Pending approval** when an approval gate exists.

### As approver

1. Open the same **open execution period**.
2. Use the **Pending achievement approvals** panel at the top (lists all `submitted` items), **or** find the KPI in the tree (badge: **Pending approval**).
3. Click **Approve** or **Reject**.
4. On approve, parent goals update in rollup; executor receives a notification.
5. On reject, executor can edit and resubmit; they receive a notification.

### Same user with both permissions

1. Submit achievement on the leaf (executor action).
2. Separately approve it (approver action) — two audit log entries.

### Complete period

- All required leaf KPIs must be **approved** (when gate exists) or **submitted/approved** (when no gate).
- Period **cannot complete** while achievements are **pending approval**.
- Use **Complete period** only when readiness shows all KPIs ready.

## Notifications

| Event | Recipients |
|-------|------------|
| Submitted | Approvers in scope (when approval gate exists) |
| Approved | Original submitter |
| Rejected | Original submitter |

Links open the execution period plan view (`/plans/{periodVersionId}`).

## Implementation map

| Step | Area |
|------|------|
| 1 | Permissions & scope (`planAchievementPermissionUtils`, `planAchievementScopeService`) |
| 2 | Workflow columns on `plan_nodes` (`period_actual_status`, audit fields) |
| 3 | APIs & UI submit/approve/reject |
| 4 | Rollup v2 (`planExecutionRollupService` + approval gates) |
| 5 | Executor UX (leaf-only targets, status hints) |
| 6 | Approver pending panel |
| 7 | Notifications, readiness metrics, period-complete blocking |
