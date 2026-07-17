# NovaCure — Audit

## Storage

Table `audit_logs`:

| Column | Notes |
|--------|--------|
| `audit_id` | UUID PK |
| `actor_user_id` | Nullable (failed login without user) |
| `action` | e.g. `login_success`, `create`, `void`, `send` |
| `resource_type` | e.g. `auth`, `user`, `role`, `cashier_payment` |
| `resource_id` | Optional UUID |
| `details` | JSONB (userAgent, before/after, amounts, etc.) |
| `ip_address` | Best-effort from request |
| `created_at` | Indexed |

Writer: `backend/services/auditService.js` → `logAudit()` (fire-and-forget; failures logged).

## Covered events (Wave C)

- Auth: login success/fail, logout, password change/reset (OTP + admin)
- RBAC: role create/delete, user-role assign/remove
- Clinical: workflow submit
- Finance: send-to-cashier, payment create/void (existing), receipt reprint
- Attachments: upload/delete
- Patients / billing catalog / cashier sessions (pre-existing)

## Read API

`GET /api/audit-logs` — requires `audit_log:view` (Super Admin / Admin by migration).

Query params: `page`, `limit`, `search`, `actor_user_id`, `resource_type`, `action`, `from_date`, `to_date`.

UI: `/admin/audit-logs` (Audit explorer).

## Retention

No automated purge yet. Prefer archive/export before truncating. Design note: optional later job keyed on `created_at`.
