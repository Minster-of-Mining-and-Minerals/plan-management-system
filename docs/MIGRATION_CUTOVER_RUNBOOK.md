# Migration Cutover Runbook (Snapshot → Clean Baseline → Restore)

**Date:** 2026-07-16  
**Status:** Tooling ready · throwaway validation **PASSED** · apply to `pms` requires explicit run

---

## What was done

1. **Full + schema + data snapshots** written under `database/backups/` (gitignored).
2. **Canonical schema** at `database/schema/baseline_schema.sql` (cleaned for Sequelize).
3. **65 old active migrations** archived to  
   `backend/migrations/_legacy/pre_squash_20260716/` (not executed by Sequelize).
4. **Single active migration:**  
   `backend/migrations/20260901000001-baseline-full-schema.js`
5. **Throwaway validation passed:**  
   `node scripts/db-cutover.js --validate-only`  
   - Migrated clean baseline  
   - Restored data (excl. old `SequelizeMeta`)  
   - Smoke: 47 tables, 321 users, 76 plan_versions, Meta = baseline only

---

## Snapshots on disk (examples)

| File | Purpose |
|------|---------|
| `database/backups/pms_backup_2026-07-16_14-17-57.sql` | Full dump (rollback safety net) |
| `database/backups/pms_schema_2026-07-16_14-17-57.sql` | Schema-only dated copy |
| `database/backups/pms_data_2026-07-16_14-17-57.sql` | Data-only (no SequelizeMeta) |
| `database/schema/baseline_schema.sql` | Canonical schema for the baseline migration |

---

## Apply cutover to your configured DB (`pms`)

From `backend/`:

```bash
# Optional: refresh snapshots first
npm run db:snapshot

# Apply (DROPS and recreates DB_NAME, migrates baseline, restores latest data_*.sql)
npm run db:cutover:apply
```

Or:

```bash
node scripts/db-cutover.js --apply
```

### Rollback if something goes wrong

```bash
npm run db:import -- database/backups/pms_backup_2026-07-16_14-17-57.sql
```

(Use the latest `pms_backup_*.sql` full dump.)

After a full-dump restore you will have the **old** migration history again. To return to the clean path, re-run cutover apply (only if active migrations are still the single baseline).

---

## Day-to-day after cutover

| Command | Meaning |
|---------|---------|
| `npm run migrate` | Applies only the single baseline on empty DBs |
| `npm run db:fresh` | Drop → create → baseline migrate → seeders |
| `npm run db:validate-migrations` | up → undo:all → up on throwaway DB |
| `npm run db:snapshot` | Refresh full/schema/data dumps |
| `npm run db:cutover:validate` | Rehearse cutover on throwaway DB |

---

## New scripts

| Script | Role |
|--------|------|
| `scripts/db-snapshot.js` | full / schema / data / all |
| `scripts/clean-baseline-schema.js` | Strip `\restrict`, SequelizeMeta, fix search_path |
| `scripts/archive-migrations-for-squash.js` | Move old root migrations to `_legacy/pre_squash_*` |
| `scripts/db-cutover.js` | `--validate-only` or `--apply` |

---

## Important constraints

- **Do not** put old migrations back in `migrations/` root while the baseline exists — fresh migrate will conflict.
- **Future schema changes** = new timestamped migrations **after** `20260901000001`.
- Permission seeds remain in `seeders/`; do not reintroduce permission inserts as migrations.
- Data dumps warn about circular FKs; restore uses dump disable-triggers (validated successfully).

---

## Manual checklist before `--apply`

- [ ] Confirm you are on **dev/staging** (or have an approved maintenance window)
- [ ] Confirm a recent `pms_backup_*.sql` exists
- [ ] Stop the API server / other DB clients
- [ ] Run `--validate-only` once more if dumps were refreshed
- [ ] Run `--apply`
- [ ] Smoke-test login + one plan hierarchy screen
