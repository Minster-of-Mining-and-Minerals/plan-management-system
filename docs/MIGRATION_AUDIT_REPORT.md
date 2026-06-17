# Migration Audit Report

**Project:** Plan Management System  
**Date:** 2026-06-16 (validated)  
**Architect:** Consolidated baseline + archived corrective chain  
**Validation:** `npm run db:validate-migrations` — **PASSED** (up → undo:all → up)

---

## Executive Summary

The migration history has been refactored into **8 idempotent baseline migrations** that build the full production schema in a single `db:migrate` run on an empty database. All **15 corrective migrations** (09–23) and **32 legacy incremental migrations** are archived under `backend/migrations/_legacy/` and are **not executed** by Sequelize CLI.

| Metric | Before refactor | After refactor |
|--------|-----------------|----------------|
| Active migration files | 23 | **8** |
| Corrective / data-fix migrations in active path | 15 | **0** |
| Legacy incremental migrations | 32 (archived) | 32 (archived, unchanged) |
| Schema built from empty DB | Required 23 runs | **8 runs** |
| Rollback-safe baselines | Partial | **8/8** (child-first + IF EXISTS) |
| Idempotent `up()` guards | Baselines only | **All active migrations** |

---

## A. Removed / Archived Migrations (from active path)

These files **no longer run** on new environments. They remain in `_legacy/` for audit.

### A.1 Legacy incremental chain (`_legacy/` — 32 files)

See `_legacy/README.md`. Superseded by baselines 01–08.

### A.2 Corrective chain (`_legacy/corrective/` — 15 files)

| File | Type | Reason archived |
|------|------|-----------------|
| `20260701000009-add-plan-rule-step-color.js` | Schema + data backfill | `color_hex` already in baseline 03 CREATE |
| `20260701000010-fix-plan-version-unique-index.js` | Index fix | Partial unique index merged into baseline 03 |
| `20260701000011-add-plan-lifecycle-finalization-fields.js` | Schema ALTER | Columns merged into baseline 03 |
| `20260701000017-add-process-started-at.js` | Schema ALTER | Column merged into baseline 03 |
| `20260701000023-add-plans-edit-finalized-permission.js` | Data seed | Moved to `seed-permissions.js` |
| `20260701000012` – `20260701000016` | Data-only fixes | Not needed on empty DB; irreversible |
| `20260701000018` – `20260701000022` | Data-only fixes | Not needed on empty DB; irreversible |

---

## B. Merged Migrations

| Original corrective | Merged into | What was merged |
|-------------------|-------------|-----------------|
| `09` plan-rule-step-color | `20260701000003-baseline-plan-core.js` | `color_hex` on `plan_rule_steps` (CREATE, not ALTER) |
| `10` fix-plan-version-unique-index | `20260701000003` | `uq_plan_versions_master_year_version_govt` partial UNIQUE (master only) |
| `11` lifecycle finalization fields | `20260701000003` | `annual_targets_finalized_at`, `period_subdivision_mode`, `period_targets_finalized_at` |
| `17` process-started-at | `20260701000003` | `process_started_at` |
| `23` edit-finalized permission | `20251029134413-seed-permissions.js` | `plans:edit_finalized` permission + Super Admin link |
| Notification templates seeder | `20260701000007-baseline-notifications.js` | 7 default `notification_templates` rows (idempotent insert) |
| `demo-users` seeder | `20251029134413-seed-permissions.js` | Super Admin role, admin user, role_permissions |
| Branding / audit-log permission seeders | `20251029134413-seed-permissions.js` | `branding_settings:*`, `system_audit_logs:read` |
| Performance threshold role assignment seeder | `20251029134413-seed-permissions.js` | All permissions linked to Super Admin |

### Plan versions — final column set (baseline 03)

`plan_rule_id`, draft fields, planning dates, `version_kind`, `parent_plan_version_id`, `period_label`, lifecycle timestamps (`annual_targets_finalized_at`, `period_targets_finalized_at`, `process_started_at`), `period_subdivision_mode`, `finalized_at`, full status ENUM, version_kind ENUM.

### Plan nodes — final column set (baseline 03)

`weight_mode`, `assignment_sharing_mode`, `source_plan_node_id`, `annual_target`, `period_target`, `target_unit`, `"order"`.

---

## C. Dependency Problems Found & Resolved

| Issue | Resolution |
|-------|------------|
| Global UNIQUE on `(year, version_number, government_structure_id)` blocked multiple annual/period versions | Partial index `uq_plan_versions_master_year_version_govt` WHERE `version_kind = 'master'` |
| `internal_assignments` references `external_assignments` | External assignments table created first (baseline 04) |
| Self-referential FKs on `plan_versions`, `plan_nodes`, structures | Single CREATE with deferred-safe order |
| ENUM types orphaned on rollback | `dropEnumTypes()` after all dependent tables dropped |
| Corrective migrations 12–22 had circular dependency on runtime data | Removed from active path; not applicable to fresh installs |

### Schema dependency diagram (text)

```
permissions ── role_permissions ── roles
            └── permission_group_permissions ── permission_groups
                      └── user_permission_groups ── users
                      └── government_structure_permission_groups

government_structures ── internal_structures
        │                      └── users ── user_roles
        │                              └── notifications
        │                              └── system_audit_logs
        ├── plan_rules ── plan_rule_steps
        ├── plan_versions ── plan_nodes ──┬── external_assignments
        │         (self-FK)               ├── internal_assignments ── plan_assignment_actions
        │                                 └── plan_node_action_logs
        ├── planning_configurations
        └── branding_settings ── branding_audit_logs

plan_assignment_actions (lookup)
performance_color_thresholds
notification_templates ── notifications
attachments (standalone)
```

---

## D. Rollback Problems Fixed

All **8 active baselines** use `backend/migrations/helpers/schemaHelpers.js`:

| Pattern | Implementation |
|---------|----------------|
| Drop child tables before parents | `dropTablesInOrder()` with explicit ordering |
| Drop indexes before tables | `dropIndexIfExists()` per index |
| Drop ENUMs after tables | `dropEnumTypes()` |
| Idempotent create | `createTableIfNotExists()` |
| Idempotent drop | `dropTableIfExists()` |
| Safe column add (helpers available) | `addColumnIfNotExists()` / `removeColumnIfExists()` |

**Verified rollback order (example: baseline 03 down):**

1. Drop node indexes → drop `plan_nodes`
2. Drop version indexes (including master partial unique) → drop `plan_versions`
3. Drop rule step unique index → drop `plan_rule_steps` → drop `plan_rules`
4. Drop all related ENUM types

**Note:** Archived data migrations (12–22) intentionally have no-op or irreversible `down()` — they must never be re-added to the active path.

---

## E. Final Migration Order (active)

| # | File | Purpose |
|---|------|---------|
| 1 | `20260701000001-baseline-auth-and-permissions.js` | permissions, roles, permission_groups, junctions |
| 2 | `20260701000002-baseline-org-and-users.js` | government/internal structures, users, assignments |
| 3 | `20260701000003-baseline-plan-core.js` | plan_rules, plan_versions, plan_nodes (+ lifecycle fields, master-only unique index) |
| 4 | `20260701000004-baseline-plan-assignments.js` | assignments, action logs |
| 5 | `20260701000005-baseline-planning-config.js` | planning_configurations + default row |
| 6 | `20260701000006-baseline-platform-settings.js` | performance thresholds, branding, audit logs |
| 7 | `20260701000007-baseline-notifications.js` | notification_templates (+ 7 defaults), notifications |
| 8 | `20260701000008-baseline-attachments.js` | attachments |

Helper: `backend/migrations/helpers/schemaHelpers.js`

---

## F. Idempotency Protection

All active baselines use:

- `CREATE TABLE IF NOT EXISTS` via `createTableIfNotExists`
- `CREATE INDEX IF NOT EXISTS` in raw SQL
- `DROP INDEX IF EXISTS` / `DROP TYPE IF EXISTS` on rollback
- Seed inserts guarded by `SELECT … LIMIT 1` checks (planning config, notification templates)

---

## G. Naming Conventions (standardized)

| Object | Pattern | Examples |
|--------|---------|----------|
| Tables | snake_case plural | `plan_versions`, `plan_nodes` |
| Columns | snake_case | `annual_targets_finalized_at` |
| Indexes | `idx_<table>_<column>` | `idx_plan_nodes_plan_version_id` |
| Unique indexes | `uq_<table>_<description>` | `uq_plan_versions_master_year_version_govt` |
| Foreign keys | Sequelize inline `references` | CASCADE/RESTRICT/SET NULL as intentional |

---

## H. Seeder Refactoring

### Removed seeders (merged or redundant)

| Removed file | Replacement |
|--------------|-------------|
| `20251108201545-demo-users.js` | Super Admin bootstrap in `seed-permissions.js` |
| `20260606000001-seed-notification-templates.js` | Templates in baseline 07; demo notifications removed |
| `20260607000002-seed-branding-permissions.js` | Merged into `seed-permissions.js` |
| `20260608000001-seed-system-audit-log-permissions.js` | Merged into `seed-permissions.js` |
| `20260604000003-assign-performance-threshold-permissions.js` | Super Admin gets all permissions in `seed-permissions.js` |

### Active seed order

1. `20251029134413-seed-permissions.js` — all permissions + Super Admin + admin user (idempotent)
2. `20260505000001-seed-plan-assignment-actions.js`
3. `20260505500001-seed-mom-organizational-hierarchy.js`
4. `20260507000001-seed-default-plan-rule.js`
5. `20260604000002-seed-performance-color-thresholds.js`
6. `20260607000001-seed-default-branding.js`
7. `20260608000002-seed-sample-system-audit-logs.js` (demo only)
8. `20260506000001-seed-mom-demo-plan.js` (demo only)

---

## I. Existing Database Transition

If `SequelizeMeta` already lists migrations 09–23, **do not re-run them**. Your schema should already match after the merge if all were applied.

After verifying schema parity:

```sql
DELETE FROM "SequelizeMeta"
WHERE name LIKE '20260701000009%'
   OR name LIKE '2026070100001%'
   OR name LIKE '2026070100002%';
```

**Warning:** Do not run `db:migrate:undo:all` when SequelizeMeta lists archived legacy filenames from `_legacy/`.

---

## J. Fresh Database Setup

```bash
cd backend
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

Expected: **8 migrations**, full schema, default notification templates, permissions, optional demo seeds.

---

## K. Remaining Manual Actions

1. **CI:** Add `npm run db:validate-migrations` to pipeline (script at `backend/scripts/validate-migrations.js`).
2. **`users.deleted_at`:** Model uses paranoid mode but column exists — align Sequelize config if needed.
3. **Production cutover:** Run schema parity check before deleting SequelizeMeta rows for archived migrations 09–23.
4. **Demo notifications:** Previously seeded by notification-templates seeder; re-add to demo plan seeder if needed.
5. **Intentional soft FKs:** `user_roles.assigned_by`, `notifications.template_code`, `attachments.uploaded_by` — add FKs only if product requires strict referential integrity.

## M. Validation Results (2026-06-16)

```
npm run db:validate-migrations
✓ 8 migrations up on empty DB
✓ db:migrate:undo:all — no FK errors
✓ Re-migrate — idempotent, no duplicate object errors
```

### FK index improvements (baseline 01–02)

Added explicit indexes on junction/FK columns:
- `idx_role_permissions_role_id`, `idx_role_permissions_permission_id`
- 11 org/user junction indexes (government structures, internal structures, users, roles, permission groups)

See `docs/MIGRATION_DEPENDENCY_REPORT.md` for the full pre-refactor dependency analysis.

---

## L. Data Safety Flags

| Migration (archived) | Data impact | Safe strategy |
|---------------------|-------------|---------------|
| `16` remove-uninitialized-execution-periods | **Deletes** period versions + nodes | Never run on production with live period data unless validated |
| `18` clear-default-period-targets | Clears `period_target` values | One-time fix only |
| `20–22` order reassignment | Rewrites all node order | One-time fix only; fresh DB uses default order from CREATE |

No production data is deleted by the **8 active baselines** on a fresh install.
