# Archived Corrective Migrations (09–23)

These 15 migration files were **development-time corrections** applied after the baseline schema (migrations 01–08). Their **schema changes are merged into the baseline files**; their **data mutations are not re-run on fresh databases**.

## Why archived?

| Category | Files | Resolution |
|----------|-------|------------|
| Redundant schema | `09`, `10`, `11`, `17`, `23` | Merged into `20260701000003` / `20260701000007` / permissions seeder |
| One-time data fixes | `12`–`16`, `18`–`22` | Not needed on empty DB; retained here for audit only |

## Do not run on new environments

Fresh databases should execute **only** migrations `20260701000001` through `20260701000008`.

## Existing databases

If `SequelizeMeta` already lists these filenames, your schema/data reflects those runs. Do **not** delete those rows unless you have verified the merged baselines match your live schema.

Optional cleanup after verifying schema parity:

```sql
DELETE FROM "SequelizeMeta"
WHERE name LIKE '20260701000009%' OR name LIKE '2026070100001%' OR name LIKE '2026070100002%';
```

**Warning:** Data-only migrations (`12`–`22`) cannot be reversed. Rolling them back was always a no-op.
