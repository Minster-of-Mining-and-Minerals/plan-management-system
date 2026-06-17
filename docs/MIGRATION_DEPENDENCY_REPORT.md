# Migration Dependency Report

**Project:** Plan Management System  
**Date:** 2026-06-16  
**Purpose:** Pre-refactor analysis of the full migration chain (47 historical files → 8 active baselines)

---

## 1. Executive Summary

The project previously had **55 migration files** across three layers:

| Layer | Count | Status |
|-------|-------|--------|
| Legacy incremental (`_legacy/*.js`) | 32 | Archived — not executed |
| Corrective fixes (`_legacy/corrective/*.js`) | 15 | Archived — not executed |
| **Active baselines** (`migrations/*.js`) | **8** | **Production path** |

All schema changes from the legacy + corrective chains are **merged into 8 idempotent baseline migrations**. Data-only corrective migrations are **excluded** from the active path.

**Validation:** `npm run db:validate-migrations` — passes `migrate → undo:all → migrate` on a throwaway database.

---

## 2. What Will Be / Was Merged

### 2.1 Legacy → Baseline merge map

| Baseline | Absorbs legacy files |
|----------|---------------------|
| `20260701000001` auth | `20260501000001`–`00003`, `00007`, `00009` |
| `20260701000002` org/users | `20260501000004`–`00006`, `00008`, `00010`, `00011` |
| `20260701000003` plan core | `20260504000012`–`00013`, `20260507000001`, `20260508000001`, `20260509000001`, `20260605000001` (node part), `20260609000001`, `20260610000001`, `20260611000001`, `20260612000001` (node part), `20260613000001` (version part) |
| `20260701000004` assignments | `20260504000014`–`00017`, `20260605000001` (assignment part) |
| `20260701000005` planning config | `20260609000002`, `20260612000001` (config part), `20260613000001` (config part) |
| `20260701000006` platform | `20260604000001`, `20260607000001`, `20260608000001` (schema only) |
| `20260701000007` notifications | `20260606000001` |
| `20260701000008` attachments | `20251210084020` |

### 2.2 Corrective → Baseline merge map

| Corrective | Action | Target |
|------------|--------|--------|
| `09` plan-rule-step-color | Schema merged | Baseline 03 (`color_hex` in CREATE) |
| `10` fix-plan-version-unique-index | Index merged | Baseline 03 (partial unique on master) |
| `11` lifecycle finalization fields | Schema merged | Baseline 03 |
| `17` process-started-at | Schema merged | Baseline 03 |
| `23` edit-finalized permission | Data moved | `seed-permissions.js` |
| `12`–`16`, `18`–`22` | **Removed from active path** | Data-only; N/A on fresh DB |

---

## 3. What Was Removed from Active Path

### 3.1 Redundant schema migrations (merged, not re-run)

- `09`, `10`, `11`, `17` — ALTER/INDEX operations folded into baseline CREATE
- All 32 legacy incremental files — superseded by baselines

### 3.2 Data-only migrations (archived)

| File | Operation | Why excluded |
|------|-----------|--------------|
| `12` unlock-all-annual-plan-versions | UPDATE | Runtime fix |
| `13` reset-annual-status | UPDATE | Runtime fix |
| `14` open-all-plan-versions | UPDATE | Runtime fix |
| `15` sync-master-period-subdivision-mode | UPDATE | Runtime fix |
| `16` remove-uninitialized-execution-periods | **DELETE** | Destructive |
| `18` clear-default-period-targets | UPDATE | Runtime fix |
| `19` sync-period-node-annual-targets | UPDATE | Runtime fix |
| `20` reassign-plan-node-order | UPDATE | Runtime fix |
| `21` sync-derived-plan-node-order | UPDATE | Runtime fix |
| `22` master-only-plan-node-order | UPDATE | Runtime fix |

---

## 4. Dependency Order (Active Migrations)

```
01 auth & permissions
 └── permissions, roles, permission_groups, role_permissions, permission_group_permissions

02 org & users  [depends: 01 roles, permission_groups]
 └── government_structures, internal_structures, users, user_roles,
     user_permission_groups, government_structure_permission_groups

03 plan core  [depends: 02 government_structures]
 └── plan_rules → plan_rule_steps
     plan_versions (self-FK, FK to plan_rules, government_structures)
     plan_nodes (self-FK, FK to plan_versions)

04 plan assignments  [depends: 03 plan_nodes, 02 users/structures]
 └── plan_assignment_actions
     external_assignments → internal_assignments (self-FK, branch FKs)
     plan_node_action_logs

05 planning config  [depends: 02 government_structures]
 └── planning_configurations (+ default row seed)

06 platform settings  [depends: 02 government_structures, users]
 └── performance_color_thresholds, branding_settings → branding_audit_logs, system_audit_logs

07 notifications  [depends: 02 users]
 └── notification_templates (+ 7 default rows), notifications

08 attachments  [standalone — no FK]
 └── attachments
```

### 4.1 Circular references (resolved)

| Relationship | Resolution |
|--------------|------------|
| `government_structures.parent_id` → self | SET NULL on delete; table created before FK enforced |
| `internal_structures.parent_id` → self | SET NULL on delete |
| `plan_versions.based_on_version_id` / `parent_plan_version_id` | Self-FK; single CREATE |
| `plan_nodes.parent_id` / `source_plan_node_id` | Self-FK; single CREATE |
| `internal_assignments.branch_internal_assignment_id` | Self-FK; table dropped atomically on rollback |

No unresolved circular **creation** dependencies.

---

## 5. Foreign Key Audit

### 5.1 Intentional missing FKs (documented)

| Table | Column | Reason |
|-------|--------|--------|
| `user_roles` | `assigned_by` | Audit field; user may be deleted |
| `notifications` | `template_code` | Soft reference to templates by code |
| `attachments` | `uploaded_by` | Optional uploader; no constraint |

### 5.2 Cascade rules (verified)

| Pattern | Usage |
|---------|-------|
| CASCADE | Junction tables, child plan nodes, assignments |
| SET NULL | Optional structure/user references |
| RESTRICT | `plan_versions.government_structure_id`, `internal_assignments.action_id`, audit log actors |

### 5.3 FK indexes added (2026-06-16)

Baseline 01 and 02 now include explicit `idx_<table>_<column>` on all junction/FK lookup columns.

---

## 6. Rollback Order (Per Baseline)

All baselines follow: **indexes → child tables → parent tables → ENUM types**

| Baseline | Rollback sequence |
|----------|-------------------|
| 01 | Drop FK indexes → junction tables → lookup tables |
| 02 | Drop 11 FK indexes → 6 tables (child-first) |
| 03 | Drop 6 indexes → plan_nodes → plan_versions → plan_rule_steps → plan_rules → 6 ENUMs |
| 04 | Drop 11 indexes → action_logs → internal → external → actions → 1 ENUM |
| 05 | planning_configurations → 1 ENUM |
| 06 | Drop 6 indexes → audit_logs → branding_audit → branding → thresholds |
| 07 | Drop 3 indexes → notifications → templates → 4 ENUMs |
| 08 | attachments |

**Verified:** Full `db:migrate:undo:all` succeeds without FK violations.

---

## 7. Duplicate Schema Operations Eliminated

| Duplicate (legacy) | Resolution |
|------------------|------------|
| Global UNIQUE on plan_versions year/version/govt | Replaced by partial index (master only) |
| `plan_rules.weight_mode` + `plan_rule_steps.weight_mode` | Removed; final: `plan_nodes.weight_mode` only |
| Unconditional assignment unique indexes | Replaced by partial `WHERE is_active = true` |
| Repeated permission seeders (4 files) | Merged into `seed-permissions.js` |
| Notification template seeder | Merged into baseline 07 |
| Demo users seeder | Merged into `seed-permissions.js` |

---

## 8. Seeder Dependency Order

```
1. 20251029134413-seed-permissions.js       (permissions, Super Admin, admin user)
2. 20260505000001-seed-plan-assignment-actions.js
3. 20260505500001-seed-mom-organizational-hierarchy.js
4. 20260507000001-seed-default-plan-rule.js
5. 20260604000002-seed-performance-color-thresholds.js
6. 20260607000001-seed-default-branding.js
7. 20260608000002-seed-sample-system-audit-logs.js  (demo)
8. 20260506000001-seed-mom-demo-plan.js              (demo)
9. 20260616000001-seed-alternative-minister-of-mines-structure.js  (optional)
10. 20260616000002-seed-alternative-mom-institutes-structure.js    (optional)
```

All active seeders use idempotent checks (`SELECT LIMIT 1`, `ensurePermission`, sector-exists guards).

---

## 9. Remaining Manual Actions

1. **Existing DBs with SequelizeMeta rows 09–23:** Clean meta after schema parity check (see audit report §I).
2. **CI:** Add `npm run db:validate-migrations` to pipeline.
3. **Production:** Never run archived data migrations 12–22.
4. **`plans:edit_finalized`:** Requires `db:seed:all` (not migrate alone).

---

## 10. Files Reference

| Path | Role |
|------|------|
| `backend/migrations/20260701000001`–`00008` | Active baselines |
| `backend/migrations/helpers/schemaHelpers.js` | Idempotent up/down utilities |
| `backend/migrations/_legacy/` | Archived incremental history |
| `backend/migrations/_legacy/corrective/` | Archived corrective history |
| `backend/scripts/validate-migrations.js` | Rollback validation |
| `docs/MIGRATION_AUDIT_REPORT.md` | Full audit deliverable |
