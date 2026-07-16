# Pre-squash active migrations (2026-07-16)

These **65** migration files were the active Sequelize chain before the
snapshot → clean baseline → restore cutover.

They are **not executed** by Sequelize CLI (subdirectory of `_legacy/`).

## Replacement

- Active migration: `migrations/20260901000001-baseline-full-schema.js`
- Schema source: `database/schema/baseline_schema.sql`
- Runbook: `docs/MIGRATION_CUTOVER_RUNBOOK.md`

## Do not restore these to the migrations root

Doing so alongside the full-schema baseline will break fresh installs
(duplicate CREATE TYPE / TABLE).

Future schema changes must be **new** migrations dated after `20260901000001`.
