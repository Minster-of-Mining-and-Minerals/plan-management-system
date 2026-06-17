# Database backups

PostgreSQL dumps for the Plan Management System (`pms` database by default).

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

Or with an absolute path to the `.sql` file.

**Warning:** Restore uses `--clean` dumps and replaces existing objects in the target database. Use a dev/staging database unless you intend to overwrite production data.

## Restore plan drafts only (from backup)

If you re-seeded migrations but lost plan drafts, restore just plan tables from an export:

```bash
npm run db:restore-plans
```

Or with a specific backup file:

```bash
npm run db:restore-plans -- database/backups/pms_backup_2026-06-16_115430.sql
```

This keeps users, roles, and org structure intact and reloads `plan_versions`, `plan_nodes`, assignments, planning config, and plan rules from the backup.

## Manual commands (Windows)

```powershell
$env:PGPASSWORD = "root"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h localhost -p 5432 -U postgres -d pms --no-owner --no-acl --clean --if-exists -f database/backups/manual_backup.sql
```

```powershell
$env:PGPASSWORD = "root"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -p 5432 -U postgres -d pms -v ON_ERROR_STOP=1 -f database/backups/manual_backup.sql
```

## Git

`*.sql` backup files are ignored by git (they may contain user data and credentials). Keep exports on disk or in secure storage outside the repo.
