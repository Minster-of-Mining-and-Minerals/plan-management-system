# NovaCure — Permissions

## Model

Effective permissions for **INTERNAL** users come from:

1. **Roles** → `role_permissions` → `permissions`
2. **Permission groups** → `permission_group_permissions` → `permissions`
3. Role name **`Super Admin`** grants `*:*` (all)

Format: `resource:action` (lowercase in API middleware; uppercase in frontend nav, e.g. `USERS:READ`).

## Account types

| `account_type` | Portal | Permission resolution |
|----------------|--------|------------------------|
| `INTERNAL` | Staff app | Roles + groups |
| `PATIENT` | `/patient/*` | No RBAC list; portal routes only |
| `PHARMACY` | `/pharmacy/*` | Portal-scoped APIs |

## Notable Wave C permissions

| Resource | Action | Purpose |
|----------|--------|---------|
| `audit_log` | `view` | Audit explorer (`GET /api/audit-logs`) |
| `finance_collections` | `view` | Daily collections + CSV export |
| `cashier_*` | various | Cashier desk / payments |
| `users` / `roles` / `permission_groups` | CRUD + assign | Admin RBAC |

Seed source: `backend/seeders/20251029134413-seed-permissions.js` plus follow-on migrations (receipt templates, collections, audit view, etc.).

## Checking in code

- Backend: `checkPermission("resource", "action")`, `checkAnyPermission([["a","b"], ...])`
- Frontend: `usePermissions()` / `hasAnyPermission` with `RESOURCE:ACTION` keys
- Nav gating: `frontend/src/navigation.config.ts` + `useInternalNavigation`
