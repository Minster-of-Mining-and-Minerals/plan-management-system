# NovaCure — Audit

## Storage

Table `audit_logs`:

| Column | Notes |
|--------|--------|
| `audit_id` | UUID PK |
| `actor_user_id` | Nullable (failed login without user) |
| `action` | e.g. `login_success`, `user_create`, `attachment_upload` |
| `resource_type` | e.g. `auth`, `user`, `role`, `cashier_payment`, `attachment` |
| `resource_id` | Optional UUID |
| `details` | JSONB — prefer `module`, `outcome`, `userAgent`, `previous`/`next` |
| `ip_address` | Best-effort from request |
| `created_at` | Indexed |

Writers:

- `logAudit()` — low-level insert
- `auditContextFromReq(req, extra)` — IP + User-Agent
- `recordAudit(req, { action, resourceType, … })` — preferred standardized helper

## Covered events

- Auth: login success/fail, logout, password change/reset (OTP + admin)
- Users: create, update, deactivate (+ admin password reset)
- RBAC: role create/delete, user-role assign/remove, permission group create
- Patients: create / update / deactivate
- Clinical: workflow submit (action_type)
- Finance: billing mutations, send-to-cashier, payment create/void, receipt reprint, session open/close, collections export
- Attachments: upload / delete
- Audit: CSV export (`audit_export`)
- Billing catalog / branding mutations (where wired)

## Read API

`GET /api/audit-logs` — requires `audit_log:view`.

Query params: `page`, `limit`, `search`, `actor_user_id`, `resource_type`, `action`, `from_date`, `to_date`.

## Export API

`GET /api/audit-logs/export` — same filters; CSV download (capped, default 10k rows, max 25k).  
Requires `audit_log:view`. Export itself is audited.

UI: `/admin/audit-logs` (Audit explorer) — **Export CSV** button.

## Retention

No automated purge yet. Prefer archive/export before truncating. Design note: optional later job keyed on `created_at`.
