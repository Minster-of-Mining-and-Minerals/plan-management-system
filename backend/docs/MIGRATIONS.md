# Database migrations — NovaCure HMS

## Overview

The migration system was refactored from **46 incremental/patch migrations** into **8 baseline schema migrations** plus **seeders** for data and permissions.

| Layer | Location | Purpose |
|-------|----------|---------|
| Schema | `migrations/2026010100000*.js` | Tables, indexes, FKs, enums |
| Data | `seeders/` | Permissions, roles, branding, form catalog, demo users |
| Archive | `migrations/archive/legacy/` | Historical migrations (not executed) |
| Helpers | `migrations/_helpers/` | Shared utilities (not executed) |

## Baseline dependency graph

```
20260101000001  permissions, roles, permission_groups
                role_permissions, permission_group_permissions
        │
        ▼
20260101000002  users (account_type: INTERNAL | PATIENT)
        │
        ├──────────────────────────────┐
        ▼                              ▼
20260101000003                  20260101000004
user_roles                      departments, user_titles
user_permission_groups                  │
        │                              │
        └──────────┬───────────────────┘
                   ▼
20260101000005  internal_user_profiles, patient_profiles, patient_field_values
                   │
                   ▼
20260101000006  form_field_groups → form_fields
                   │
                   ▼
20260101000007  system_branding, audit_logs
                   │
                   ▼
20260101000008  attachments
```

## Seeder order

| Seeder | Purpose |
|--------|---------|
| `20251029134413-seed-permissions.js` | Full permission catalog |
| `20251108201545-demo-users.js` | Demo users, roles, Super Admin → all permissions |
| `20260501000013-seed-default-branding.js` | Default branding row |
| `20260102000001-seed-role-permissions-matrix.js` | Patient/dept/titles/form groups → roles |
| `20260527000002-seed-user-form-fields.js` | Patient form catalog (`ensurePatientFormCatalog`) |
| `20260604000005-seed-default-user-titles.js` | Dr., Nurse, etc. |
| `20260602000003-seed-sample-patients.js` | Demo patients (dev only) |

## What was cleaned

### Removed from `db:migrate` (moved to seeders or eliminated)

- **Branding patch migrations** (4× UPDATE) — data only; default row comes from seeder
- **Branding schema renames** (`golden_*` → `accent_*`) — final columns in baseline 07
- **User → Patient form pivot** — baseline creates Patient model fields directly
- **Permission INSERT migrations** — consolidated in permissions + role-matrix seeders
- **Sample patients / form catalog in migrations** — seeders only
- **Internal profile backfill** — demo seeder creates profiles; app creates on user insert
- **drop-structures** — template leftover; never part of greenfield schema
- **Super Admin permission sync migration** — Super Admin gets all perms in demo-users seeder

### Schema improvements

- `UNIQUE (resource, action)` on `permissions`
- `internal_user_profiles` includes `department_id` + `title_id` FKs from creation
- `attachments.uploaded_by` → FK to `users`

## Commands

```bash
# Fresh database (development)
npm run db:fresh

# Migrate only
npm run migrate

# Seed only
npm run seed

# Undo all baseline migrations (empty DB rebuild)
npm run migrate:undo:all
```

## Production / existing databases

**Do not** run `db:migrate:undo:all` if `SequelizeMeta` contains archived migration names — undo will fail because files were moved to `archive/legacy/`.

If your schema **already matches** the baseline (you ran the old migrations before this refactor):

```bash
node scripts/mark-baseline-migrations.js
```

This inserts the 8 baseline migration names into `SequelizeMeta` without re-running DDL (**no data loss**).

Verify first:

- Tables exist: `departments`, `user_titles`, `patient_field_values`, `audit_logs`, etc.
- `system_branding` has `accent_hsl` (not `golden_dark_hsl`)
- `users.account_type` exists

## Fresh install validation checklist

- [ ] `npm run db:fresh` completes without errors
- [ ] 8 rows in `SequelizeMeta`
- [ ] No duplicate `(resource, action)` in `permissions`
- [ ] Login as `admin@gmail.com` / `password` works
- [ ] Departments, user titles, patients modules load

## Rollback

Each baseline migration implements `down()` dropping tables in reverse FK order. Enum types are dropped where applicable.

Rolling back the full baseline on a **new** install:

```bash
npm run migrate:undo:all
```
