# Migration Dependency Report (Pre-Refactor)

**Project:** Plan Management System  
**Date:** 2026-07-16  
**Status:** ANALYSIS ONLY — no migration files modified yet  
**Scope:** Active `backend/migrations/*.js` (65 files) + archived `_legacy/` (47 files) + seeders

---

## Executive Summary

| Metric | Current state |
|--------|----------------|
| Active migrations | **65** |
| Archived (`_legacy`) | **47** (not executed) |
| Prior baseline refactor (2026-06-16) | **8–11 baselines** still present |
| Post-baseline incremental drift | **~54** ALTER / permission / corrective files |
| Critical greenfield blocker | `20260629000002` runs **before** permissions table exists |
| Stale docs | `MIGRATION_AUDIT_REPORT.md` still claims “8 active migrations” |

The June 2026 baseline consolidation was successful, but development since then recreated the same problem the baselines solved: stacked corrective ALTERs, permission seeds inside migrations, and duplicate nullability/index patches.

**This report proposes what to merge, remove, reorder, and rewrite. Implementation waits for approval.**

---

## Recommended Strategy (choose before coding)

| Option | Approach | Best for | Risk |
|--------|----------|----------|------|
| **A. Greenfield squash** | Replace active chain with ~18 logical modules; archive all 65 | Empty / throwaway DBs only | **Breaks** existing `SequelizeMeta` on shared/prod DBs |
| **B. Compatibility cleanup** | Keep applied filenames; fix critical order; archive pure duplicates; harden `down()`; stop adding correctives | Databases that already migrated | Safer; does not fully “single-run clean history” for old DBs |
| **C. Dual-track (recommended)** | (1) Harden + dedupe for existing Meta; (2) Add `migrations_v2/` or stamped `20260901*` squash for **new** environments only | Teams with both prod and fresh CI | Extra docs/ops discipline |

**Recommendation:** **Option C**. Preserve production safety; give CI/`db:fresh` a clean path.

---

## A. Inventory Counts by Classification

| Class | Count | Meaning |
|------:|------:|---------|
| BASELINE | 11 | Core CREATE modules (`000001`–`000009`, `000011`, issues/system) |
| FEATURE | ~28 | New tables/columns/capabilities |
| CORRECTIVE | ~12 | Index patches, nullability, data backfills, ALTER chains |
| PERMISSION / SEED-IN-MIGRATION | ~12 | Permission inserts that belong in seeders |
| IDEMPOTENCY / DEDUP | 3 | Merge duplicate permission keys / unique indexes |
| **Total active** | **65** | |

---

## B. Critical Dependency Problems Found

### B.1 Broken fresh-migrate order (CRITICAL)

```
20260629000002-add-documents-permissions.js   ← RUNS FIRST
20260701000001-baseline-auth-and-permissions.js  ← creates permissions table
```

`20260629000002` inserts into `permissions` / `role_permissions` **before** baseline 01 creates those tables.  
**Impact:** `db:fresh` / empty-DB migrate fails or depends on accidental prior state.

**Proposed action:** Remove from active path (move to `_legacy/corrective/`) OR re-timestamp after baseline 01; prefer **delete from active path** — already covered by `seed-permissions.js`.

### B.2 Circular / self-FK (resolved at design level)

| Relationship | Status |
|--------------|--------|
| `government_structures.parent_id` | Self-FK — OK |
| `plan_versions` parent / based_on / snapshots | Self-FK — OK |
| `plan_nodes.parent_id` / `source_plan_node_id` | Self-FK — OK |
| `plan_rules.owned_by_plan_version_id` ↔ `plan_versions.plan_rule_id` | Soft cycle — create tables then add FKs carefully on squash |
| `plan_amendments.compensates_amendment_id` | Self-FK — OK |

No unresolved **create-order** circular dependency if modules are ordered as in Section E.

### B.3 Partial-undo FK traps (HIGH)

Amendment / reallocation block must undo strictly:

```
140001 → 130003 → 130002 → 130001 → 120002 → 120001
```

Undoing `plan_amendments` while `target_reallocation_requests.plan_amendment_id` or `plan_amendment_actions` still exist will fail.

### B.4 Duplicate nullability (MEDIUM)

`internal_assignments.action_id` DROP NOT NULL appears in:

1. `20260702000001`
2. `20260709000003`
3. `20260709000004` (**exact duplicate of 03**)

Baseline 04 still creates `action_id` as NOT NULL.

### B.5 Evolving unique index (MEDIUM)

`uq_plan_versions_master_year_version_govt` redefined three times:

1. Baseline 03 — master only  
2. `000024` — exclude review snapshots  
3. `020011` — also exclude execution snapshots  

**Final intended predicate:**  
`version_kind = 'master' AND review_snapshot_of_plan_version_id IS NULL AND execution_snapshot_of_plan_version_id IS NULL`  
(verify exact column names in code during implementation)

---

## C. What Will Be Merged

### C.1 Fold into earlier CREATE (greenfield / squash track)

| Merge into | Absorb |
|------------|--------|
| Baseline plan-core | Review columns (`000010`–`000013`), execution snapshot columns (`020010`), **final** master unique index (`000024` + `020011`), period actuals / override / achievement workflow / annual achievement / narration / contribution weight / target_allocation_mode / validate columns (as one achievement module or plan-core extension) |
| Baseline plan-assignments | Nullable `action_id`, `role_id`, `assignment_context`, `permission_group_id` (`020001`, `020002`, `090003`; drop `090004`) |
| Baseline org | `logo_path` (`020004`) |
| Baseline platform | Branding UI colors (`020008`), branding scoped indexes (`020005`) |
| Notes create | `pin_order` (`020007`) |
| Plan rules create | `inherit_to_descendants`, `performance_scoring_policy`, `amendment_policy` |
| Reallocation + amendments | Single module: tables from `120001` + `130001` + link `130003` + platform `140001` columns/actions **without** empty-DB backfill |
| Issues stack | Hierarchy + form containers + flat FK model as final CREATE shape; archive `000027` data migration for greenfield |

### C.2 Move out of migrations → seeders

| Migration | Target |
|-----------|--------|
| `20260629000002` documents perms | `seed-permissions.js` (already present) |
| `20260803000001` share/forward | seeder |
| `20260702000014` override parent | seeder / special groups |
| `20260703000002`, `000003` | seeder |
| `20260704000001` achievement perms | seeder |
| `20260812000002`, `20260813000002` | seeder |
| `20260808000001` sector aggregation perm | seeder |
| `20260801000001` bypass perm portion | seeder (schema flag stays in system_settings module) |
| `20260807000001` special-tier update | seeder / data patch |

### C.3 Exact duplicate to remove (no schema loss)

| File | Reason |
|------|--------|
| `20260709000004-fix-internal-assignment-action-id-nullable.js` | Duplicate of `090003` |
| `20260703000003` (if specs already in `030001`) | Duplicate permission seed |
| `20260629000002` | Wrong order + covered by seeder |

---

## D. What Will Be Removed / Archived (from active path)

### D.1 Already archived (no change needed)

- `_legacy/*.js` — 32 incremental files (pre-baseline)  
- `_legacy/corrective/*.js` — 15 files (schema merged or data-only)

### D.2 Proposed new archives (after approval)

| File / group | Reason |
|--------------|--------|
| Pure permission migrations listed in C.2 | Not schema |
| `090004` | Duplicate corrective |
| `000027` migrate-legacy-category-forms | Data-only; N/A on empty DB; destructive down |
| Permission merge no-ops that already ran in prod | Keep Meta history OR archive only on squash track |

**Data-loss flags (do not silently delete from prod path):**

| Item | Risk | Safe strategy |
|------|------|----------------|
| Squashing migrations already in `SequelizeMeta` | Meta mismatch → migrate thinks schema incomplete | Option C dual-track; never rewrite applied files on prod |
| Dropping “unused” columns without inventory | Lost production data | Inventory against models + live DB first |
| ENUM value removal | PostgreSQL cannot drop enum values easily | Leave enum values; document as irreversible |
| `000027` down DELETE | Destroys form rows | Keep irreversible; exclude from greenfield |

---

## E. Proposed Clean Migration Order (Logical Modules)

Target for **greenfield squash** (~18 modules), dependency-safe:

```
01  Auth & permissions (tables only)
02  Org & users (+ logo_path)
03  Plan core (rules, versions, nodes + final master unique index + lifecycle)
04  Plan assignments (nullable action_id, role, permission_group)
05  Planning configuration (+ monthly enum values)
06  Platform settings (thresholds, branding+colors+indexes, audit logs)
07  Notifications (+ documents category + default templates)
08  Attachments
09  Issues & forms (final flat/container shape)
10  Plan review (columns + snapshot FKs + review_version_number)
11  Execution snapshots
12  Notes (+ pin_order)
13  Roles scope + special permission groups (schema)
14  Achievement & scoring (all plan_node achievement columns + rule policies)
15  Draft version ownership (version-owned rules/config)
16  Sector aggregation publishes
17  Target reallocation + plan amendments + actions + link (single CREATE)
18  System settings (+ bypass flag)

THEN: seed-permissions.js (idempotent UPSERT) + domain seeders
```

### Schema dependency diagram (text)

```
permissions ── role_permissions ── roles
            └── permission_group_permissions ── permission_groups
                      └── user_permission_groups ── users
                      └── government_structure_permission_groups
                      └── internal_structure_permission_groups

government_structures ── internal_structures
        │                      └── users
        ├── plan_rules ── plan_rule_steps
        │       ↑↓ owned_by / planning_configuration (draft ownership)
        ├── plan_versions ── plan_nodes ──┬── external_assignments
        │    (self / review / execution)  ├── internal_assignments
        │                                 └── plan_node_action_logs
        ├── planning_configurations
        ├── plan_sector_aggregation_publishes
        ├── plan_period_target_baselines
        ├── target_reallocation_requests ──► plan_amendments
        └── branding_settings ── branding_audit_logs

plan_amendments ── plan_amendment_actions ── plan_amendment_histories
        │ (compensates self-FK)
        └── target_reallocation_requests.plan_amendment_id

notification_templates ── notifications
system_settings
attachments / notes / issues stack (parallel branches off users + structures)
```

---

## F. Rollback Problems to Fix (per migration / module)

| Problem | Fix pattern |
|---------|-------------|
| Bare `dropTable` | `dropTableIfExists` via `schemaHelpers` |
| Drop parent before child | Explicit child-first lists |
| Drop column with index | `dropIndexIfExists` then `removeColumnIfExists` |
| Drop ENUM while columns exist | Drop tables/columns first, then `DROP TYPE IF EXISTS` |
| Partial undo of amendment block | Document required undo order; consider single module |
| Missing IF EXISTS | Add for indexes, constraints, tables |

**Target:** `npm run db:validate-migrations` (`migrate → undo:all → migrate`) passes on throwaway DB.

---

## G. Idempotency Gaps

| Area | Today | Target |
|------|-------|--------|
| Baselines 01–08 (+ helpers) | Mostly guarded | Keep |
| Most post-baseline files | Bare `addColumn` / `createTable` | Use `schemaHelpers` or fold into CREATE |
| Permission migrations | Partial `ensurePermission` | Seeder-only UPSERT |
| Amendment platform backfill | INSERT without strong guards on re-run | Greenfield: CREATE with final shape; no backfill |

---

## H. Naming Standardization (apply on squash)

| Object | Convention |
|--------|------------|
| Tables | `snake_case`, plural (existing: `plan_nodes`, `users`) — **preserve existing names** |
| Columns | `snake_case` |
| Indexes | `idx_<table>_<column(s)>` |
| Unique | `uq_<table>_<column(s)>` |
| FK | `fk_<table>_<referenced_table>` (or current Sequelize names if already deployed — rename only on greenfield) |

**Do not rename live production table/column identifiers** unless a dedicated rename migration is approved (data-safe, dual-write period).

---

## I. Seed Refactoring (deferred phase)

| Issue | Action |
|-------|--------|
| Permissions double-defined in migrations + `seed-permissions.js` | Single seeder source of truth |
| Multiple MoM organogram seeders | Keep as alternate scenarios; document which to run |
| Demo plans overlap | Keep separate; document |
| Idempotency | Prefer `ON CONFLICT` / select-before-insert (already common) |

---

## J. Final Active Order Today (65 files)

See inventory in analysis: timestamps from `20260629000002` … `20260814000001`.  
**Do not reorder applied production migrations** without Meta surgery.

---

## K. Proposed Implementation Phases (after approval)

| Phase | Work | Touches prod Meta? |
|------:|------|--------------------|
| 0 | This report (done) | No |
| 1 | Fix CRITICAL: archive/repath `20260629000002`; delete `090004`; update docs | Soft — only if not yet applied everywhere |
| 2 | Harden `down()` + schemaHelpers on recent feature migrations (amendments, reallocation, notes) | Additive only preferred |
| 3 | Dual-track greenfield squash (`20260901*` or `migrations_v2`) + validate script | No (new stamps) |
| 4 | Consolidate permission seeds; deprecate migration-based perms | Careful on already-applied |
| 5 | Archive superseded incrementals from active folder **only** when all environments on squash or Meta rewritten | High risk |

---

## L. Remaining Manual Actions (always)

1. Confirm whether any shared/prod DB has `20260629000002` in `SequelizeMeta`.  
2. Choose Option A / B / C.  
3. Run `npm run db:validate-migrations` on a throwaway database after each phase.  
4. Inventory live columns vs models before any DROP.  
5. Update `docs/MIGRATION_AUDIT_REPORT.md` after implementation (currently stale).

---

## M. Decision Gate

**No migration files have been modified.**

Approve one of:

1. **Option C Phase 1–2 only** (safe cleanup + rollback hardening)  
2. **Option C full** (cleanup + greenfield squash track)  
3. **Option A** (full replace — confirm no prod Meta depends on current 65)

Then implementation will proceed with the audit report sections A–E filled with *executed* results.
