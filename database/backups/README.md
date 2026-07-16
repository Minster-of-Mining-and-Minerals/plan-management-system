# Database backups

PostgreSQL dumps for the Plan Management System (`pms` database by default).

## Migration cutover (clean baseline)

After the 2026-07-16 squash, schema is built from a **single** baseline migration.
See [docs/MIGRATION_CUTOVER_RUNBOOK.md](../docs/MIGRATION_CUTOVER_RUNBOOK.md).

```bash
# From backend/
npm run db:snapshot          # full + schema + data (data excludes SequelizeMeta)
npm run db:cutover:validate  # throwaway rehearsal
npm run db:cutover:apply     # DROP/recreate DB_NAME + baseline + restore data
```

## Export (create a backup)

From the `backend` folder:

```bash
npm run db:export
```

This writes a file here named like `pms_backup_YYYY-MM-DD_HHMMSS.sql`.

The script reads connection settings from `backend/.env` (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`).

If `pg_dump` is not on your PATH, set `PG_BIN_DIR` in `.env`, for example:

```env
PG_BIN_DIR=C:\Program Files\PostgreSQL\18\bin
```

## Import (restore a backup)

From the `backend` folder:

```bash
npm run db:import -- database/backups/pms_backup_YYYY-MM-DD_HHMMSS.sql
```

**Warning:** Restore uses `--clean` dumps and replaces existing objects in the target database.

## Git

`*.sql` backup files are ignored by git. Keep exports on disk or in secure storage.

`database/schema/baseline_schema.sql` **is** committed (schema only, no row data).
