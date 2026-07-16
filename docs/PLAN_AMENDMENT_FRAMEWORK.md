# Plan Amendment Framework

Single mechanism for controlled changes to approved plans **after execution has started**.

```text
Effective Plan  =  Original Baseline  +  Applied Amendments (in version order)
```

The approved baseline is never silently overwritten. Every post-start change is an amendment with audit history.

This framework does **not** implement every amendment type. Types plug in via handlers. **Target Reallocation** is the first real implementation.

See also: [TARGET_REALLOCATION.md](./TARGET_REALLOCATION.md)

---

## Core concepts

| Concept | Storage |
|---------|---------|
| Amendment envelope | `plan_amendments` |
| Field-level audit | `plan_amendment_histories` |
| Type-specific payload | `plan_amendments.metadata` (JSONB) — handlers own the shape |
| Amendment sequence | `plan_amendments.version` (set on apply, unique per draft) |

**Baseline** for period targets remains `plan_period_target_baselines` (captured at Start Process). Amendments change the **effective** execution snapshot, not the baseline rows.

---

## Status workflow

```text
draft → pending_approval → approved → applied
                ↘ rejected
                ↘ cancelled
draft → cancelled
```

- DB/API values are **lowercase** (`pending_approval`, `applied`, …).
- **Approve auto-applies** in one transaction (`approved` is transient; response shows `applied`).
- Target Reallocation facade statuses map: `pending_approval` ↔ `pending`.

---

## Amendment types

| Type | Available |
|------|-----------|
| `target_reallocation` | **Yes** |
| `annual_target_revision` | Registered placeholder |
| `budget_increase` | Registered placeholder |
| `budget_reduction` | Registered placeholder |
| `kpi_addition` | Registered placeholder |
| `kpi_removal` | Registered placeholder |
| `owner_transfer` | Registered placeholder |
| `timeline_extension` | Registered placeholder |
| `plan_correction` | Registered placeholder |
| `custom` | Registered placeholder |

Unavailable types reject create/validate with a clear “not available yet” message.

---

## Plugin architecture

```text
PlanAmendmentEngine
  → resolve handler from registry by amendment_type
  → validate / preview / apply
  → write plan_amendment_histories
  → bump version + status
  → framework notifications + system audit
```

### Handler contract (`PlanAmendmentHandler`)

| Method | Responsibility |
|--------|----------------|
| `supports(type)` | Type match |
| `isAvailable()` | Product can create this type today |
| `validate(ctx)` | Metadata + domain rules (no writes) |
| `preview(ctx)` | Proposed outcome (no writes) |
| `apply(ctx)` | Mutate domain inside engine transaction; return history rows |
| `rollback(ctx)` | Stub for future |

Business logic lives **only** in handlers. The engine must not grow type-specific `switch` blocks.

### How to add a new amendment type

1. Ensure the type exists in `utils/planAmendmentTypes.js` (and DB enum if new).
2. Set `AMENDMENT_TYPE_AVAILABILITY[type] = true` when ready.
3. Implement `YourHandler extends PlanAmendmentHandler` under `services/planAmendment/handlers/`.
4. Register it in `planAmendmentRegistry.js` (replace the placeholder).
5. Add verify coverage for validate / preview / apply math.
6. **Do not** change the engine for type-specific rules.

---

## Permissions

| Permission | Allows |
|------------|--------|
| `plan:request_amendment` | Create / submit / cancel |
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
| `POST` | `/plan-amendments` |
| `GET` | `/plan-amendments` |
| `GET` | `/plan-amendments/:id` |
| `GET` | `/plan-amendments/:id/preview` |
| `POST` | `/plan-amendments/:id/submit` |
| `POST` | `/plan-amendments/:id/approve` |
| `POST` | `/plan-amendments/:id/reject` |
| `POST` | `/plan-amendments/:id/cancel` |

Create body (example):

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

### Target Reallocation product facade (UI)

Keep using:

| Method | Path |
|--------|------|
| `POST/GET` | `/target-reallocations` |
| `POST` | `/target-reallocations/:id/approve\|reject\|cancel` |
| `GET` | `/versions/:id/period-target-reallocation-reporting` |

These dual-write a linked `plan_amendments` row (`target_reallocation_requests.plan_amendment_id`) so clients stay stable while the framework owns the lifecycle.

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

## Target Reallocation metadata

```json
{
  "kpiId": "<live annual KPI plan_node_id>",
  "fromPeriodId": "<live execution period plan_version_id>",
  "toPeriodId": "<live execution period plan_version_id>",
  "amount": 10,
  "reason": "...",
  "legacy_request_id": "<optional target_reallocation_request_id>"
}
```

Apply updates **snapshot** period KPI `period_target` values. Annual target is unchanged. When `legacy_request_id` is set, `target_allocation_histories` are dual-written for reporting compatibility.

---

## File map

```text
backend/
  models/plan/PlanAmendment.js
  models/plan/PlanAmendmentHistory.js
  services/planAmendment/
    planAmendmentEngine.js
    planAmendmentRegistry.js
    planAmendmentScopeService.js
    planAmendmentNotificationService.js
    targetReallocationDomain.js
    handlers/
      PlanAmendmentHandler.js
      placeholderHandlers.js
      targetReallocationHandler.js
  utils/planAmendmentTypes.js
  utils/planAmendmentWorkflowUtils.js
  utils/planAmendmentPermissionUtils.js
  utils/planAmendmentMessages.js
  controllers/plan/planAmendmentController.js
  validators/plan/planAmendmentValidator.js
```

Verify scripts: `scripts/verify-plan-amendment-step1.js` … `step8.js`.

---

## Out of scope (placeholders only)

Annual target revision, KPI add/remove, owner transfer, timeline extension, budget increase/reduction, automatic redistribution, cross-year moves.
