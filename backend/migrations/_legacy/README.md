# Archived Legacy Migrations

This folder contains **historical migration files that are not executed** by Sequelize CLI.

## Contents

| Folder / files | Count | Description |
|----------------|-------|-------------|
| Root `_legacy/*.js` | 32 | Original incremental history (Dec 2025 – Jun 2026) |
| `corrective/*.js` | 15 | Post-baseline fixes (migrations 09–23) |

## Active migrations

Fresh databases use **only** the 8 baseline files in the parent `migrations/` folder:

`20260701000001` through `20260701000008`

See `docs/MIGRATION_AUDIT_REPORT.md` for the full audit, merge map, and transition guide.

## Why archived?

- Corrective migrations (weight_mode relocation, ALTER chains) folded into baseline CREATE statements
- Data-only fix migrations removed from active path (not needed on empty DB)
- Rollback failures from FK order and missing ENUM cleanup resolved in baselines
- Duplicate index/constraint operations eliminated

## Existing databases

If your `SequelizeMeta` table lists filenames from this folder or from archived corrective migrations, your schema was built incrementally. See `docs/MIGRATION_AUDIT_REPORT.md` section **I. Existing Database Transition**.

These files are retained for **historical reference and audit trail only**.
