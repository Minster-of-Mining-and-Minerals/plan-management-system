# NovaCure Platform — System Architecture

**Audience:** Senior engineers joining the codebase.  
**Scope:** Outpatient EMR (registration → schedule → clinical workflow → billing → cashier → pharmacy).  
**Stack:** Express 5 + Sequelize + PostgreSQL | Next.js (App Router) + RTK Query + NextAuth.

---

## 1. Overall architecture

```
Browser
  └─ Next.js (web:3000) — portals + NextAuth session cookie
       └─ Bearer JWT → Express API (api:4000)
            ├─ REST /api/*
            ├─ Socket.IO /socket.io (same HTTP server, JWT handshake)
            └─ Sequelize → PostgreSQL
Nginx (optional) terminates TLS and proxies /api, /socket.io, /, /uploads
```

Three **account types** isolate portals:

| Account | Primary UI | API prefix examples |
|---------|------------|---------------------|
| `INTERNAL` | Staff EMR | `/api/patients`, `/api/workflow`, `/api/finance/*` |
| `PATIENT` | Patient portal | `/api/patient-portal/*` |
| `PHARMACY` | Pharmacy portal | `/api/pharmacy-portal/*` |

Frontend `middleware.ts` redirects cross-portal navigation; **API middleware is the real boundary**.

---

## 2. Repository folder structure

```
novacure-platform/
├── backend/
│   ├── app.js                 # HTTP + Socket.IO bootstrap
│   ├── config/                # env, branding, constants, securityBootstrap
│   ├── controllers/           # HTTP adapters by domain
│   ├── middlewares/           # auth, account type, upload, rate limit
│   ├── models/                # Sequelize models (domain folders)
│   ├── routers/               # Express routers
│   ├── services/              # Business logic
│   ├── validators/            # Joi schemas
│   ├── migrations/ / seeders/
│   ├── utils/                 # logger, pagination, httpError, …
│   └── tests/                 # smoke + security regression
├── frontend/
│   ├── src/app/[locale]/       # App Router pages
│   ├── src/features/          # UI by domain
│   ├── src/redux/api/         # RTK Query endpoints
│   └── src/middleware.ts      # Portal route isolation
├── nginx/                     # Reverse proxy snippets
├── docs/                      # Ops + security + this architecture doc
└── docker-compose.yml
```

---

## 3. Backend architecture

**Layering:** `Router → Middleware (authz) → Controller → Service → Model`.

- Controllers stay thin; services own transactions and domain rules.
- Shared auth: `authenticateToken`, `checkPermission`, `requireInternalAccount` / patient / pharmacy.
- Errors: prefer `sendError` (`utils/httpError.js`) so production hides 5xx internals.
- Logging: JSON logger + `X-Request-Id`; audit via `logAudit` / `recordAudit`.

---

## 4. Frontend architecture

- **Next.js App Router** with `next-intl` locales.
- **NextAuth** holds session; API JWT copied to memory/`localStorage` via `AuthInitializer` + `getAuthToken`.
- **RTK Query** (`baseApi`) attaches `Authorization: Bearer` and signs out on 401.
- Features are colocated under `src/features/<domain>/`.

---

## 5. Authentication flow

1. User posts credentials to Express `POST /api/auth/login` (rate-limited).
2. API verifies bcrypt hash, audits success/failure, signs JWT including `user_id`, `account_type`, `token_version`.
3. NextAuth Credentials provider stores token in session.
4. Subsequent API calls send Bearer JWT.
5. `authenticateToken` reloads user, checks `is_active`, `token_version`, and first-login allowlist.

**Revocation:** password change, admin reset, OTP reset, and logout increment `token_version` → old JWTs fail with `TOKEN_REVOKED`.

**No refresh tokens** (Phase 1 deferred). JWT TTL defaults to 12h.

---

## 6. Authorization flow

1. JWT authenticated → `req.user` with effective permissions (roles + permission groups; Super Admin `*:*`).
2. Route `checkPermission(resource, action)`.
3. Domain ownership where required (appointments via `canAccessAppointment`, attachments via `attachmentAccessService`).

Permission catalog: `docs/PERMISSIONS.md`.

---

## 7. Workflow engine

- Visit: `staff_appointments` + `workflow_tasks` + `medical_history_logs`.
- Submit/forward/return/prescribe/complete via `medicalWorkflowService`.
- Form schemas from diagnosis / user form configs (dynamic forms).
- Attachments referenced as UUID arrays on logs; ownership linked to appointment.

---

## 8. Dynamic forms

- Field definitions + groups stored in DB; rendered by `DynamicUserFormFields`.
- Types include text, select, file upload, canvas annotation.
- Server validates patient/user payloads through dynamic middleware.

---

## 9. Billing architecture

- Per-visit `appointment_billing_accounts` + line `appointment_billing_entries`.
- Catalog: billing services / categories.
- Access guarded by appointment ownership or finance/cashier bypass permissions.
- Send-to-cashier creates collection requests / queue entries.

See also `docs/FINANCE_MODULE_ARCHITECTURE.md`.

---

## 10. Cashier architecture

- Open/close `cashier_sessions`.
- Collect payments → `cashier_payments` + tenders; print receipts (template-driven).
- Daily collections list + CSV export (`finance_collections:view`).

---

## 11. Patient portal

- `requirePatientAccount`; all queries scoped to `req.user.user_id`.
- Profile, schedules, prescriptions, notifications — no internal staff APIs.

---

## 12. Pharmacy portal

- `requirePharmacyAccount` + pharmacy context from `pharmacy_user_profiles`.
- Forwards, dispense, attachment files linked via `prescription_pharmacy_forward_files`.

---

## 13. Audit architecture

- Table `audit_logs`: actor, action, resource_type/id, details JSONB, ip, created_at.
- Writer: `services/auditService.js` (`logAudit`, `recordAudit`, `auditContextFromReq`).
- Reader: `GET /api/audit-logs` + `GET /api/audit-logs/export` (CSV), permission `audit_log:view`.
- UI: `/admin/audit-logs` (`AuditExplorerPage`).

Details: `docs/AUDIT.md`.

---

## 14. Notification architecture

- Persisted notifications listed via authenticated APIs; UI dropdown + full page.
- Socket.IO is authenticated but primary delivery remains REST polling/fetch.

---

## 15. Attachment architecture (security-critical)

- Files stored under `uploads/attachments/`; static `/uploads/attachments` is blocked.
- API: `POST/GET/DELETE /api/attachments`, `GET /api/attachments/:id/file`.
- Columns: `uploaded_by`, `resource_type`, `resource_id`, `patient_id`.
- Authorization: `attachmentAccessService` — permission **and** ownership (uploader, patient self, appointment access, pharmacy forward). Unauthorized access returns **404** (no existence leak).

---

## 16. Deployment architecture

- Compose: `postgres`, `api` (migrate-on-start), `web`, optional `nginx`.
- Secrets required: `JWT_SECRET`, `AUTH_SECRET`/`NEXTAUTH_SECRET`, `POSTGRES_PASSWORD`.
- Health: `GET /api/health` (DB probe). Graceful shutdown on SIGTERM.
- Runbook: `docs/DEPLOYMENT.md`, checklist: `docs/PRODUCTION_CHECKLIST.md`.

---

## 17. Database overview

- PostgreSQL 16; Sequelize migrations under `backend/migrations`.
- Baseline chain documented in `backend/docs/MIGRATIONS.md`.
- Key domains: users/RBAC, patients, scheduling, workflow, diagnosis, prescriptions/pharmacy, finance/cashier, attachments, audit, branding.

---

## 18. API overview

| Area | Mount |
|------|--------|
| Auth | `/api/auth` |
| Users / RBAC | `/api/users`, `/api/roles`, `/api/permissions`, `/api/permission-groups` |
| Patients / scheduling | `/api/patients`, schedules, staff appointments |
| Workflow | `/api/workflow` (approx.) |
| Finance | `/api/finance/*` |
| Attachments | `/api/attachments` |
| Audit | `/api/audit-logs` |
| Dashboard | `/api/dashboard` |
| Health | `/api/health` |
| Portals | `/api/patient-portal`, `/api/pharmacy-portal` |

Swagger is off in production unless `ENABLE_SWAGGER=true`.

---

## 19. Extension guidelines

1. Prefer new **service** + thin controller; reuse `checkPermission` and ownership helpers.
2. Add Joi validators for new write endpoints.
3. Call `recordAudit` / `logAudit` on security-sensitive mutations.
4. Keep list endpoints paginated (`utils/pagination.js`); avoid unbounded dumps.
5. Do not serve PHI via public static paths — use authenticated attachment APIs.
6. Add a security regression test under `backend/tests/security/` when changing authz.
7. Document permission keys in `docs/PERMISSIONS.md`.

---

*Last updated: July 2026 — Phase 1 production hardening closeout.*
