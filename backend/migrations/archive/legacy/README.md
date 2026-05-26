# Legacy migrations (archived)

These **46 migrations** were replaced on **2026-01-01** by the consolidated baseline set:

| Baseline | Replaces (summary) |
|----------|-------------------|
| `20260101000001` | permissions, roles, permission_groups, role_permissions, permission_group_permissions |
| `20260101000002` | users + account_type |
| `20260101000003` | user_roles, user_permission_groups |
| `20260101000004` | departments, user_titles |
| `20260101000005` | internal_user_profiles, patient_profiles, patient_field_values |
| `20260101000006` | form_field_groups, form_fields (Patient model, final shape) |
| `20260101000007` | system_branding (final columns), audit_logs |
| `20260101000008` | attachments |

## Do not run these files

Sequelize CLI only executes `migrations/*.js` at the top level. Files here are kept for **audit history** and rollback reference.

## Production databases already on legacy history

If `SequelizeMeta` lists old migration names and your schema already matches the baseline:

1. **Do not** run baseline migrations on that database.
2. Use `node scripts/mark-baseline-migrations.js` (see `docs/MIGRATIONS.md`) after verifying schema parity.

## Fresh environments

```bash
npm run db:reset:seed
```

Runs 8 baseline migrations + seeders only.
