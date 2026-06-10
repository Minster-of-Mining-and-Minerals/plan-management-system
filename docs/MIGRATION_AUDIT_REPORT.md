# Migration Audit Report

**Project:** Plan Management System  
**Date:** 2026-06-10

---

## Executive Summary

The original **32 incremental migrations** contained corrective ALTER chains, duplicate schema operations, and rollback failures. They are **archived** in `backend/migrations/_legacy/` and replaced by **8 idempotent baseline migrations** that produce the identical final schema.

| Metric | Before | After |
|--------|--------|-------|
| Active migration files | 32 | 8 |
| Corrective/refactor migrations | 2 | 0 |
| ALTER-only plan_version migrations | 5 | 0 (merged) |
| Rollback with FK-safe order | ~5/32 | 8/8 |
| Idempotent up() guards | Rare | All baselines |

---

## A. Removed / Archived Migrations

All 32 files live in `backend/migrations/_legacy/` (not executed by Sequelize CLI).

| Legacy File | Reason |
|-------------|--------|
| `20251210084020-create-attachments.js` | Merged into `20260701000008` |
| `20260501000001` – `20260501000011` | Merged into `20260701000001`, `20260701000002` |
| `20260504000012-create-plan-versions.js` | Merged into `20260701000003` (final shape) |
| `20260504000013-create-plan-nodes.js` | Merged into `20260701000003` |
| `20260504000014` – `20260504000017` | Merged into `20260701000004` |
| `20260507000001-create-plan-rules.js` | Merged into `20260701000003` |
| `20260508000001-refactor-plan-rule-weight-mode.js` | Removed — corrective migration |
| `20260509000001-move-weight-mode-to-plan-nodes.js` | Removed — corrective migration |
| `20260604000001` – `20260608000001` | Merged into `20260701000006`, `20260701000007` |
| `20260609000001` – `20260613000001` | Merged into `20260701000003`, `20260701000005` |

---

## B. Merged Changes

### Plan versions (6 legacy files → 1 CREATE)

Final columns in baseline 3: `plan_rule_id`, draft fields, planning dates, `version_kind`, `parent_plan_version_id`, `period_label`, full status ENUM (`draft`, `active`, `completed`, `finalized`, `locked`), version_kind ENUM (`master`, `annual`, `execution_period`).

### Plan nodes (6 legacy files → 1 CREATE)

Final columns: `weight_mode`, `assignment_sharing_mode`, `source_plan_node_id`, `annual_target`, `period_target`, `target_unit`.

### Weight mode chain eliminated

```
plan_rules.weight_mode → plan_rule_steps.weight_mode → plan_nodes.weight_mode
```

Baseline: `weight_mode` only on `plan_nodes`.

### Assignments

Partial unique indexes for active assignments created directly (never creates superseded full unique index).

---

## C. Dependency Problems Found

| Issue | Resolution |
|-------|------------|
| internal → external assignment FK order | External created before internal (baseline 4) |
| plan_versions / plan_nodes self-FKs | Single CREATE with self-references |
| year+version_number UNIQUE collision | App uses offset version_number for execution periods |

---

## D. Rollback Fixes

- Child tables dropped before parents in every `down()`
- `DROP INDEX IF EXISTS` before column/table drops
- PostgreSQL ENUM types dropped after dependent tables
- `dropTableIfExists` / `createTableIfNotExists` for idempotency

Verified: `20260701000008` undo + re-migrate succeeds.

---

## E. Final Migration Order

1. `20260701000001-baseline-auth-and-permissions.js`
2. `20260701000002-baseline-org-and-users.js`
3. `20260701000003-baseline-plan-core.js`
4. `20260701000004-baseline-plan-assignments.js`
5. `20260701000005-baseline-planning-config.js`
6. `20260701000006-baseline-platform-settings.js`
7. `20260701000007-baseline-notifications.js`
8. `20260701000008-baseline-attachments.js`

Helper: `backend/migrations/helpers/schemaHelpers.js`

---

## F. Schema Dependency Diagram

```
permissions ── role_permissions ── roles
            └── permission_group_permissions ── permission_groups

government_structures ── internal_structures ── users
        │                                      ├── user_roles
        │                                      ├── notifications
        │                                      └── system_audit_logs
        ├── plan_versions ── plan_nodes ── assignments / action_logs
        ├── plan_rules ── plan_rule_steps
        ├── planning_configurations
        └── branding_settings ── branding_audit_logs

plan_assignment_actions (lookup)
performance_color_thresholds | notification_templates | attachments
```

---

## G. Existing Database Transition

Baseline migrations are idempotent on existing databases:

```bash
cd backend && npx sequelize-cli db:migrate
```

Optional SequelizeMeta cleanup (after successful baseline run):

```sql
DELETE FROM "SequelizeMeta"
WHERE name LIKE '202512%' OR name LIKE '202605%' OR name LIKE '202606%';
```

**Warning:** Do not run `db:migrate:undo:all` when SequelizeMeta lists archived legacy filenames.

---

## H. Fresh Database

```bash
cd backend
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

---

## I. Seeder Notes

- Demo plan seeder: idempotent via `removeExistingDemo()`
- Org hierarchy seeder: fixed UUIDs
- Planning config default row: idempotent insert in baseline 5
- Permission/action seeders: run once; consider upsert if re-run needed

---

## J. Remaining Manual Actions

1. Add model-only indexes via future migration if required
2. Align `users.deleted_at` with Sequelize paranoid config
3. Add CI job: migrate + undo baseline chain on empty PostgreSQL
