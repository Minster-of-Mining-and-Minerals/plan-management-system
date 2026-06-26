# Plan Execution Achievement Rollup

How strategic performance percentages are calculated during execution (after process start).

## Principles

- **Depth-agnostic:** Works for any configured hierarchy (SF → Goal → KPI, SF → Goal → Objective → KPI, etc.).
- **Leaf KPI:** `(actual ÷ target) × 100`, rounded 0–100. Missing actual with a target counts as **0%** but remains **evaluable**.
- **No target in branch:** Node is **not evaluable** and is excluded from parent denominators.
- **Parent node:** Average of **evaluable children only** (unweighted, equal child count).
- **Period / annual / master:** Same rule — average of evaluable roots or child periods/years.

## Node result shape

Each node (and version) exposes:

| Field | Meaning |
|-------|---------|
| `execution_progress_percent` | Rounded achievement % |
| `is_evaluable` | Participates in parent/version aggregation |
| `evaluation_status` | `completed` \| `in_progress` \| `not_started` \| `no_evaluation` |
| `has_contributing_data` | At least one descendant has a recorded actual |

## Example

```
Goal 1: KPIs 100%, 50%, 25%  →  Goal 1 = 58%
Goal 2: KPIs 75%, 50%, 33%   →  Goal 2 = 53%
Goal 3: no targets             →  excluded
Goal 4: empty                  →  excluded

Strategic Focus = (58 + 53) / 2 = 56%
```

## Completed periods

Closing a period does **not** force 100% in the UI. The displayed % is the frozen rollup at close time (e.g. 51% if reporting was partial).

## Debug

```bash
cd backend
node scripts/debug-period-achievement.js --version-id <period-uuid>
```

Implementation: `backend/services/planExecutionRollupService.js`
