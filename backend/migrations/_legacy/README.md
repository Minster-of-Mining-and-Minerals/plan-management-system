# Archived Legacy Migrations

These 32 migration files represent the original incremental development history (Dec 2025 – Jun 2026).

They have been **superseded** by the baseline migration set (`20260701000001` – `20260701000008`) in the parent `migrations/` folder.

## Why archived?

- Corrective migrations (weight_mode relocation) folded into final schema
- Multiple ALTER migrations on `plan_versions` / `plan_nodes` merged into single CREATE
- Rollback failures due to FK order and missing ENUM cleanup
- Duplicate index/constraint operations removed

## Do not run these on new environments

Fresh databases should only execute the baseline migrations in `../`.

## Existing databases

If your `SequelizeMeta` table lists these filenames, your schema was built incrementally. See `docs/MIGRATION_AUDIT_REPORT.md` for the transition procedure.

These files are retained for **historical reference and audit trail only**.
