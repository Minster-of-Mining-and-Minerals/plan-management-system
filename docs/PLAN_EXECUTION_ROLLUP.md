# Plan Execution Achievement Rollup

How strategic performance percentages are calculated during execution (after process start).

## Principles

- **Depth-agnostic:** Works for any configured hierarchy (SF → Goal → KPI, SF → Goal → Objective → KPI, etc.).
- **Leaf KPI:** `(actual ÷ target) × 100`, then applied through the plan rule **performance scoring policy** (see below). Missing actual with a target counts as **0%** but remains **evaluable**.
- **No target in branch:** Node is **not evaluable** and is excluded from parent denominators.
- **Parent node:** Rollup depends on the plan rule step for the **child level**:
  - **Contribution weight off:** Equal average of evaluable children (unweighted).
  - **Contribution weight on:** Weighted average using each child's `contribution_weight` (siblings should sum to 100%). Only evaluable children participate; weights are renormalized among evaluable siblings.
- **Period / annual / master:** Equal average of evaluable roots or child periods/years (v1).

## Performance scoring policy

Configured on `plan_rules.performance_scoring_policy` (and copied onto each draft’s owned rule snapshot):

| Policy | Leaf `execution_progress_percent` | Actual value | Variance |
|--------|-----------------------------------|--------------|----------|
| `CAP_100` (default) | Capped at 100% | Never changed | Still shows OVER / UNDER / ON_TARGET |
| `ALLOW_OVER_ACHIEVEMENT` | Can exceed 100% | Never changed | Same informational variance |

Related fields on nodes/hierarchy:

| Field | Meaning |
|-------|---------|
| `raw_performance_percentage` | Uncapped `actual ÷ target` |
| `variance` / `variance_percentage` / `variance_type` | Informational over/under/on-target |
| `period_actual_narration` / `annual_actual_narration` | Required when actual ≠ target (within ±0.001) |

Draft master plans can edit Cap vs Allow on **Plan details → Rule**; saving auto-forks a snapshot if the draft still used a live template.
## Contribution weight vs target weight

| Field | Purpose |
|-------|---------|
| `weight` / `annual_target` / `period_target` | Planning targets (how much to achieve) |
| `contribution_weight` | Execution rollup share among siblings (how much each child counts toward the parent %) |

Rule step `requires_contribution_weight` is **per level** (not cascaded). Rule step `requires_weight` cascades from one start level downward.

## Node result shape

Each node (and version) exposes:

| Field | Meaning |
|-------|---------|
| `execution_progress_percent` | Rounded achievement % |
| `is_evaluable` | Participates in parent/version aggregation |
| `evaluation_status` | `completed` \| `in_progress` \| `not_started` \| `no_evaluation` |
| `has_contributing_data` | At least one descendant has a recorded actual |

## Examples

### Equal average (contribution weight off)

```
Goal 1: KPIs 100%, 50%, 25%  →  Goal 1 = 58%
Goal 2: KPIs 75%, 50%, 33%   →  Goal 2 = 53%

Strategic Focus = (58 + 53) / 2 = 56%
```

### Weighted rollup (contribution weight on at KPI level)

```
Goal: KPI A 100% (weight 50), KPI B 50% (weight 50)  →  Goal = 75%
Goal: KPI C 80% (weight 100)                          →  Goal = 80%

Strategic Focus (equal roots) = (75 + 80) / 2 = 78%
```

## Completed periods

Closing a period does **not** force 100% in the UI. The displayed % is the frozen rollup at close time (e.g. 51% if reporting was partial).

## Debug

```bash
cd backend
node scripts/debug-period-achievement.js --version-id <period-uuid>
```

Implementation: `backend/services/planExecutionRollupService.js`
