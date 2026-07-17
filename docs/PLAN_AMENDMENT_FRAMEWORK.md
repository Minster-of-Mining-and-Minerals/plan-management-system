# Plan Amendment Framework

Enterprise change-management platform for controlled changes to approved plans **after execution has started**.

```text
Effective Plan  =  Original Baseline  +  Applied Amendments (in version order)
```

The approved baseline is never silently overwritten. Every post-start change is an amendment package with audit history.

**Target Reallocation** is the first production action type. The framework is complete for adding future types without engine redesign.

See also: [TARGET_REALLOCATION.md](./TARGET_REALLOCATION.md)

---

## Core concepts

| Concept | Storage |
|---------|---------|
| Amendment package (envelope) | `plan_amendments` |
| Actions inside a package | `plan_amendment_actions` |
| Field-level audit | `plan_amendment_histories` (+ optional `plan_amendment_action_id`) |
| Action payload | `plan_amendment_actions.metadata` (JSONB) — handlers own the shape |
| Business reason | `plan_amendments.reason` — independent of actions |
| Effective timing | `effective_mode` + `effective_date` |
| Amendment sequence | `plan_amendments.version` (set on apply, unique per draft) |
| Policy | `plan_rules.amendment_policy` |

**Baseline** for period targets remains `plan_period_target_baselines` (captured at Start Process). Amendments change the **effective** execution snapshot, not the baseline rows.

### Amendment package model

```text
Plan Amendment
  title / reason / effective mode / date
  ↓ contains one or more
Plan Amendment Actions (ordered by sequence)
  ↓ each executed by its handler
```

Example package:

- Title: `FY2027 Budget Reduction`
- Reason: `Budget Reduction`
- Actions: Annual Target Revision → Target Reallocation → Ownership Transfer → KPI Deactivation

One approval, one version, one audit trail, one effective date.

---

## Status workflow

```text
draft → pending_approval → approved → applied
                ↘ rejected
                ↘ cancelled
draft → cancelled
```

- DB/API values are **lowercase** (`pending_approval`, `applied`, …).
- **Approve auto-applies** all actions in one DB transaction (`approved` is transient; response shows `applied`).
- If any action fails, the **entire amendment fails** (nothing partially applies).
- Action statuses: `pending` → `applied` | `failed` | `cancelled`.

---

## Action types (handlers)

| Type | Available |
|------|-----------|
| `target_reallocation` | **Yes** |
| `annual_target_revision` | **Yes** |
| `budget_increase` | Registered placeholder (prefer as **reason**, not action) |
| `budget_reduction` | Registered placeholder (prefer as **reason**, not action) |
| `kpi_addition` | **Yes** |
| `kpi_removal` | Registered placeholder |
| `owner_transfer` | Registered placeholder |
| `timeline_extension` | Registered placeholder |
| `plan_correction` | Registered placeholder |
| `custom` | Registered placeholder |

Unavailable types reject create/validate with a clear “not available yet” message.

**Reason ≠ action.** Reasons (budget cut, restructure, emergency) never determine execution. Only registered action handlers do.

### Annual Target Revision (available)

Revises the **effective** (execution snapshot) annual target and redistributes **open** period targets only. Completed/finalized periods never change. The live annual `annual_target` remains the **original baseline** for historical and comparison reporting.

| Concern | Behavior |
|---------|----------|
| Redistribution | `manual` · `proportional` (`AUTO_PROPORTIONAL`) · `equal` (`AUTO_EQUAL`) |
| Achievement floor | Revised annual cannot be below recorded achievement |
| Performance | Uses **current effective** annual target (not original baseline) |
| Reporting | `GET /api/plan/versions/:id/annual-target-revision-reporting` — original vs current, difference, reason, version, comparison mode |
| Conflict keys | `kpi:`, `annual_target:`, `structural:kpi:` (blocks concurrent structural amendments on the same KPI) |
| Reasons | Configurable catalog from types API (`annual_target_revision_reasons`) — not hardcoded business logic |

### Node Addition (available)

Adds a **new hierarchy node** at any allowed plan-rule step to the live master plan tree and mirrors it into the active execution snapshot after process start. When the new child level is the amendable target step, open period targets are allocated from the start period forward and owner / government structure are required. Structural-only additions (non-target levels) require title and optional weight/contribution only.

| Concern | Behavior |
|---------|----------|
| Hierarchy | Any child level allowed by `canAddChildUnder` (including root level-1 when permitted) |
| Target fields | Required only when child level equals amendable target step (`isAmendableTargetNode`) |
| Weight redistribution | `manual` · `proportional` (`AUTO_PROPORTIONAL`) · `equal` (`AUTO_EQUAL`) when step requires weight |
| Period allocation | Open periods from start to end must sum exactly to the annual target (target-bearing nodes only) |
| Finalized periods | Completed execution periods cannot receive non-zero targets |
| API type | Stored as `kpi_addition`; alias `node_addition` normalizes to `kpi_addition` |
| Reporting | `GET /api/plan/versions/:id/kpi-addition-reporting` — added nodes, reason, version, parent, targets, comparison mode |
| Conflict keys | `structural:parent:`, `node_addition:parent:`, `node_name:` / `kpi_name:` (blocks duplicate titles under the same parent) |

---

## Plugin architecture

```text
PlanAmendmentEngine
  → load actions by sequence (+ dependency check)
  → consult Plan Rules amendment_policy
  → resolve effective mode/date
  → detect conflicts (pending overlap / version mismatch)
  → for each action:
        resolve action handler
        validate / preview / impact / apply
  → write plan_amendment_histories (amendment + action level)
  → bump version + status
  → framework notifications + system audit
```

### Handler contract (`PlanAmendmentHandler` — one per **action** type)

| Method | Responsibility |
|--------|----------------|
| `supports(type)` | Type match |
| `isAvailable()` | Product can create this action today |
| `validate(ctx)` | Metadata + domain rules (no writes) |
| `preview(ctx)` | Proposed outcome (no writes) |
| `impact(ctx)` | Contribution to package impact (no writes) |
| `conflictKeys(ctx)` | KPI / period / entity keys for conflict detection |
| `apply(ctx)` | Mutate domain inside engine transaction; return history rows |
| `rollback(ctx)` | Stub — true rollback unsupported; describe compensating amendment |

Context includes: `amendment`, `action`, `metadata`, `user`, `transaction`, `policy`, `effective`.

Business logic lives **only** in handlers. The engine must not grow type-specific `switch` blocks.

### How to add a new amendment type

1. Ensure the type exists in `utils/planAmendmentTypes.js` (and DB enum if new).
2. Set `AMENDMENT_TYPE_AVAILABILITY[type] = true` when ready.
3. Implement `YourHandler extends PlanAmendmentHandler` under `services/planAmendment/handlers/` with validate / preview / impact / conflictKeys / apply.
4. Register it in `planAmendmentRegistry.js` (replace the placeholder).
5. Add a UI form and verify coverage.
6. **Do not** change the engine for type-specific rules.

After this platform work, adding a type requires only: **Action Handler + Validation + UI Form**.

---

## Effective date

| Mode | Meaning |
|------|---------|
| `immediate` | Apply on approval |
| `next_period` | Handlers honor “from next open period” |
| `custom_date` | Requires `effective_date`; handlers honor the date |

Framework stores mode/date; handlers decide domain application.

---

## Business policy (`plan_rules.amendment_policy`)

| Key | Default |
|-----|---------|
| `completed_periods_editable` | `false` |
| `automatic_redistribution` | `"manual"` |
| `allow_emergency_approvals` | `false` |
| `allow_structural_amendments_after_execution` | `true` |
| `allow_ownership_transfer` | `true` |

The framework consults Plan Rules instead of hardcoding these behaviors.

---

## Conflict detection

Before submit/approve:

- Another pending/draft amendment touching the same KPI / period / entity keys
- `expected_version` mismatch vs current applied plan version

Conflicting amendments are rejected with structured details. No silent concurrent edits.

---

## Impact analysis

`GET /plan-amendments/:id/impact` aggregates handler impact contributions (read-only):

- KPI / department / period counts
- Change summaries
- Next plan version number
- Per-action impact payloads

Nothing is modified.

---

## Preview

`GET /plan-amendments/:id/preview` aggregates all actions into:

```text
current → effective → differences (per action)
```

Nothing is saved. Single-action clients also receive `legacy_preview` for the first action.

---

## Rollback strategy

**True rollback is not supported.**

History is forward-only. To reverse an applied package, create a **compensating amendment**:

`POST /plan-amendments/:id/compensate`

Links via `compensates_amendment_id`. No history deletion. No reverse SQL updates.

---

## Permissions

| Permission | Allows |
|------------|--------|
| `plan:request_amendment` | Create / submit / cancel / compensate |
| `plan:approve_amendment` | Approve / reject |

**Aliases (still valid):**  
`plan:request_target_reallocation` / `plan:approve_target_reallocation` satisfy the same checks so existing role grants keep working.

Scope: master must have `process_started_at`; user needs sector/assignment access (or bypass). Target Reallocation facade additionally enforces **KPI-level** request/approve scope.

---

## APIs

Base path: `/api/plan`

### Generic framework

| Method | Path |
|--------|------|
| `GET` | `/plan-amendments/types` |
| `GET` | `/plan-amendments/reporting?draftId=` |
| `POST` | `/plan-amendments` |
| `GET` | `/plan-amendments` |
| `GET` | `/plan-amendments/:id` |
| `GET` | `/plan-amendments/:id/preview` |
| `GET` | `/plan-amendments/:id/impact` |
| `GET` | `/plan-amendments/:id/actions` |
| `GET` | `/plan-amendments/:id/history` |
| `POST` | `/plan-amendments/:id/submit` |
| `POST` | `/plan-amendments/:id/approve` |
| `POST` | `/plan-amendments/:id/reject` |
| `POST` | `/plan-amendments/:id/cancel` |
| `POST` | `/plan-amendments/:id/compensate` |

Create body (package example):

```json
{
  "draftId": "<master_plan_version_id>",
  "title": "FY2027 Budget Reduction",
  "reason": "Budget Reduction",
  "effectiveMode": "next_period",
  "expectedVersion": 3,
  "actions": [
    {
      "actionType": "annual_target_revision",
      "sequence": 1,
      "metadata": { "...": "..." }
    },
    {
      "actionType": "target_reallocation",
      "sequence": 2,
      "dependsOnSequence": 1,
      "metadata": {
        "kpiId": "...",
        "fromPeriodId": "...",
        "toPeriodId": "...",
        "amount": 10,
        "reason": "Redistribute after annual cut"
      }
    }
  ],
  "submit": true
}
```

Backward-compatible single-action create (still supported):

```json
{
  "draftId": "<master_plan_version_id>",
  "title": "Target Reallocation (10)",
  "amendmentType": "target_reallocation",
  "submit": true,
  "metadata": {
    "kpiId": "...",
    "fromPeriodId": "...",
    "toPeriodId": "...",
    "amount": 10,
    "reason": "Training venue unavailable"
  }
}
```

### Reporting payload highlights

`GET /plan-amendments/reporting?draftId=` returns:

- Original baseline
- Current effective plan / version
- Applied amendments (package, reason, effective date, action summary)
- Pending amendments

### Target Reallocation product facade (UI)

Keep using:

| Method | Path |
|--------|------|
| `POST/GET` | `/target-reallocations` |
| `POST` | `/target-reallocations/:id/approve\|reject\|cancel` |
| `GET` | `/versions/:id/period-target-reallocation-reporting` |

These dual-write a linked `plan_amendments` row **and** a single `plan_amendment_actions` row so clients stay stable while the framework owns the lifecycle.

**Guidance:** leave Target Reallocation UI on the facade. New amendment types should use `/plan-amendments` only.

---

## Notifications

| Event | Recipients |
|-------|------------|
| Submitted | Approvers in plan sector scope |
| Approved / applied | Requester |
| Rejected | Requester |

Types: `plan_amendment_submitted` \| `_approved` \| `_rejected`.  
Deep link: `/plans/{masterId}?tab=hierarchy&focus=reallocation` (or `focus=amendment`).

---

## File map

```text
backend/
  models/plan/PlanAmendment.js
  models/plan/PlanAmendmentAction.js
  models/plan/PlanAmendmentHistory.js
  migrations/20260814000001-plan-amendment-platform.js
  services/planAmendment/
    planAmendmentEngine.js
    planAmendmentActionRunner.js
    planAmendmentRegistry.js
    planAmendmentPolicyService.js
    planAmendmentConflictService.js
    planAmendmentImpactService.js
    planAmendmentReportingService.js
    planAmendmentEffectiveDate.js
    planAmendmentVersionUtils.js
    planAmendmentScopeService.js
    planAmendmentNotificationService.js
    targetReallocationDomain.js
    handlers/
      PlanAmendmentHandler.js
      placeholderHandlers.js
      targetReallocationHandler.js
  utils/planAmendmentTypes.js
  utils/planAmendmentActionUtils.js
  utils/planAmendmentWorkflowUtils.js
  utils/planAmendmentPermissionUtils.js
  utils/planAmendmentMessages.js
  controllers/plan/planAmendmentController.js
  validators/plan/planAmendmentValidator.js
```

Verify scripts: `scripts/verify-plan-amendment-step1.js` … `step8.js`, plus `verify-plan-amendment-platform.js`.

---

## Out of scope (placeholders only — handlers not implemented)

Annual target revision, KPI add/remove, owner transfer, timeline extension, strategic cascade, emergency mode UI, automatic redistribution engines.

These require only a new action handler + UI once productized.
