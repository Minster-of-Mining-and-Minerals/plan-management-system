# NovaCure — Phase 1 Production Hardening Audit

**Status:** Read-only audit complete. **No application code changed.**  
**Date:** July 2026  
**Goal:** Raise production readiness from ~62 to ≥85 without new clinical modules.

---

## 1. Existing architecture (summary)

| Layer | Stack |
|-------|--------|
| API | Express 5, Sequelize 6, PostgreSQL, JWT, Joi, Socket.IO |
| Web | Next.js 16, RTK Query, next-auth v5, shadcn |
| Portals | INTERNAL / PATIENT / PHARMACY via `account_type` |
| AuthZ | Roles + Permission Groups → `resource:action` |

**Strengths:** Clinical workflow, visit billing, cashier Accept/Pay, pharmacy portal are permission-gated on their critical paths.

**Weaknesses:** Several admin/RBAC/attachment/dashboard routes lack authentication; audit is write-only and partial; no tests; Docker secrets incomplete; list endpoints often load-all-then-filter.

Authoritative workflow docs: `docs/OUTPATIENT_WORKFLOW.md`, `docs/CASHIER_SOP.md`.

---

## 2. Finding register

Severity scale: **Critical** | **High** | **Medium** | **Low** | **Info**

### 2.1 Security

| ID | Severity | Finding | Impact | Risk | Recommended solution | Files |
|----|----------|---------|--------|------|----------------------|-------|
| S-01 | Critical | Roles API unauthenticated (`authenticateToken` imported unused) | Full RBAC takeover | Trivial remote exploit | `router.use(authenticateToken, requireInternalAccount)` + per-route `checkPermission` | `backend/routers/user/roleRoutes.js` |
| S-02 | Critical | Permissions activate/deactivate/toggle unauthenticated | Disable security controls | Trivial | Same pattern | `backend/routers/user/permissionRoutes.js` |
| S-03 | Critical | Permission-groups CRUD + assign users/perms unauthenticated | Privilege escalation | Trivial | Same | `backend/routers/user/permissionGroupRoutes.js` |
| S-04 | Critical | User-roles assign/remove unauthenticated | Grant Super Admin | Trivial | Same | `backend/routers/user/userRoleRoutes.js` |
| S-05 | Critical | Attachments upload/list/delete unauthenticated | Malware hosting, PHI leak, deletion | Trivial | Auth + permission + ownership; stop public static PHI | `attachmentRoute.js`, `attachmentController.js`, `app.js` `/uploads` |
| S-06 | Critical | Branding CRUD unauthenticated (only `/active` should be public) | Defacement / phishing | Trivial | Auth mutating routes | `brandingRoutes.js` |
| S-07 | Critical | Internal user create uses hardcoded password `"password"` | Mass account compromise | Certain if seeded/created | `generateRandomPassword()` + force first login | `userController.js` |
| S-08 | Critical | Docker Compose lacks `JWT_SECRET`; placeholder AUTH secrets | Token forgery if deployed as-is | High on naïve deploy | Require secrets; fail-fast startup | `docker-compose.yml`, `.env.example` |
| S-09 | High | Dashboard stats unauthenticated (auth commented out) | Ops metric leak | Easy | Restore auth + `dashboard:view` | `dashboardRoutes.js` |
| S-10 | High | User list/get/delete/toggle/reset-password missing `checkPermission` | Any internal staff can admin users | High | Add `users:*` checks | `userRoutes.js` |
| S-11 | High | Form field / group routes missing permissions | Form schema sabotage | Medium-High | `form_fields` / `form_field_groups` checks | `formFieldRoutes.js`, `formFieldGroupRoutes.js` |
| S-12 | High | No rate limiting on login / OTP / reset | Brute force, OTP spray | High | `express-rate-limit` + lockout | `app.js`, auth routers |
| S-13 | High | Socket.IO trusts `query.userId` without JWT | Presence spoofing | High | JWT handshake middleware | `app.js` |
| S-14 | High | Billing by `appointmentId` permission-only (no appointment access check) | IDOR for billing PHI | Medium-High | Reuse `canAccessAppointment` | `appointmentBillingService.js` |
| S-15 | High | Public `/uploads` static + CORS `*` | PHI download if path known | High with S-05 | Authenticated file proxy | `app.js` |
| S-16 | Medium | JWT env mismatch (`JWT_EXPIRES_IN` vs `JWT_EXPIRATION_TIME`); default 7d | Overlong sessions | Medium | Align env; shorter TTL | `authController.js`, `.env.example` |
| S-17 | Medium | Logout does not revoke JWT | Stolen token survives logout | Medium | `jti` blocklist or short TTL + refresh | `authController.js` |
| S-18 | Medium | First-login password change UI-only | API usable with default password | Medium | Backend gate except change-password | `authMiddleware.js` |
| S-19 | Medium | Weak/inconsistent password policy (6 vs 8 vs none) | Weak credentials | Medium | Central policy (min 12) | auth validators, password controllers |
| S-20 | Medium | No Helmet / security headers | Clickjacking, MIME sniff | Medium | Add `helmet` | `app.js` |
| S-21 | Medium | CORS permissive in non-prod; missing Origin allowed in prod | Misconfig risk | Medium | Strict allowlist | `app.js` |
| S-22 | Medium | Swagger `/api-docs` open in all envs | Recon | Medium | Disable or protect in production | `app.js` |
| S-23 | Medium | Middleware portal prefixes omit `/billing`, `/finance`, `/notifications`, etc. | Cross-portal edge bypass (layout mitigates) | Medium | Expand prefixes / default-deny | `frontend/src/middleware.ts` |
| S-24 | Low | Controllers return `error.message` on 500 | Info leak | Low | Generic prod errors | Multiple controllers, `app.js` |
| S-25 | Low | OTP via `Math.random` | Weaker entropy | Low | `crypto.randomInt` | `forgotPasswordController.js` |
| S-26 | Info | Patient/pharmacy portals correctly scope by account | Positive | — | Keep | portal services |

### 2.2 Audit

| ID | Severity | Finding | Impact | Risk | Recommended solution | Files |
|----|----------|---------|--------|------|----------------------|-------|
| A-01 | High | Audit coverage only patients + billing catalog + cashier session/payment | Cannot reconstruct clinical/RBAC/auth events | Compliance failure | Expand `logAudit` to auth, RBAC, workflow, Rx, attachments, send-to-cashier, config | `auditService.js` + domain services |
| A-02 | High | No GET API / permission / UI for audit logs | Unusable for ops | High | `GET /api/audit-logs` + `audit_log:view` + Audit Explorer | New routes + frontend page |
| A-03 | Medium | Failed audit writes swallowed | Silent trail loss | Medium | Structured log; fail-closed for payments/voids | `auditService.js` |
| A-04 | Medium | No before/after, browser/device, result fields | Incomplete investigation data | Medium | Extend schema carefully (backward compatible JSON details) | `auditLog` model |
| A-05 | Low | Pharmacy forward has separate audit table | Dual systems | Low | Unify in explorer later | `prescriptionPharmacyForwardAudit` |
| A-06 | Info | Schema has indexes on actor, resource, created_at | Positive | — | Add retention policy | migration |

### 2.3 Reporting foundation

| ID | Severity | Finding | Impact | Risk | Recommended solution | Files |
|----|----------|---------|--------|------|----------------------|-------|
| R-01 | Medium | Collections CSV exists but client-side limited to loaded page | Incomplete exports | Medium | Server-side export stream | `DailyCollectionsPage.tsx`, cashier service |
| R-02 | Medium | Admin dashboard mostly mock | Misleading ops | Medium | Label mocks or wire real metrics | `AdminDashboardPage.tsx` |
| R-03 | Low | `patients:export` permission seeded, no export | Dead feature | Low | Implement or defer with doc | permissions seeder |
| R-04 | High | Many lists lack SQL pagination | Memory/latency | High | Shared list helper + SQL LIMIT | patient/user/cashier/workflow lists |

### 2.4 Performance

| ID | Severity | Finding | Impact | Risk | Recommended solution | Files |
|----|----------|---------|--------|------|----------------------|-------|
| P-01 | High | Cashier/payment history: findAll → filter → slice | OOM under load | High | SQL filters + pagination | `cashierPaymentService.js` |
| P-02 | High | Queue N+1 `getLatestOpenForAccount` | Slow desk | High | Join/batch | same |
| P-03 | High | `listUsersWithPermission` loads all users | Slow notifies/receivers | High | SQL join on permissions | `userPermissionService.js` |
| P-04 | High | Missing indexes on `cashier_payments(created_at)`, `(received_by, created_at)` | Full scans | High | Migration indexes | billing migration / new |
| P-05 | Medium | Inbox/appointments no pagination | Slow clinicians | Medium | Paginate | workflow/appointment services |
| P-06 | Medium | No caching (branding, permissions) | Repeated heavy work | Medium | Short TTL cache | new util |
| P-07 | Info | Notifications/workflow indexes present | Positive | — | Keep | migrations |

### 2.5 Deployment & operations

| ID | Severity | Finding | Impact | Risk | Recommended solution | Files |
|----|----------|---------|--------|------|----------------------|-------|
| D-01 | Critical | Compose secrets placeholders / missing JWT_SECRET | Insecure deploy | Critical | Fail-fast + env_file docs | `docker-compose.yml` |
| D-02 | High | No graceful shutdown | Dropped requests on deploy | High | SIGTERM drain | `app.js` |
| D-03 | High | Migrations not in Docker entrypoint | Schema drift | High | `migrate && start` | `Dockerfile`, compose |
| D-04 | High | No backup/restore runbook | Data loss | High | Document pg_dump + uploads volume | `docs/` |
| D-05 | High | No structured logging / request IDs | Blind ops | High | pino + middleware | `logger`, `app.js` |
| D-06 | Medium | Env template drift (DB name, JWT var names, frontend `example.env`) | Misconfig | Medium | Align templates | `.env.example`, `example.env` |
| D-07 | Medium | Socket.IO separate port may break behind nginx | Lost realtime | Medium | Proxy WS or attach to HTTP | `app.js`, compose |
| D-08 | Medium | No background workers (claim expiry is request-time only) | Soft ops gap | Medium | Document + optional cron later | — |
| D-09 | Info | Health endpoint + compose healthchecks exist | Positive | — | Extend readiness (migrate check) | `healthRoutes.js` |

### 2.6 Testing

| ID | Severity | Finding | Impact | Risk | Recommended solution | Files |
|----|----------|---------|--------|------|----------------------|-------|
| T-01 | Critical | Zero automated tests | Regressions free | Critical | Vitest/Jest + Supertest smoke suite | new |
| T-02 | High | No CI pipeline | Unsafe deploys | High | GH Actions lint/build/migrate/smoke | `.github/` |

---

## 3. What is already production-grade (do not break)

- Clinical workflow permissions (`workflow:*`) and inbox model  
- Cashier session + Accept claim + send-required queue  
- Patient/pharmacy portal account scoping  
- Appointment access checks in medical workflow (`canAccessAppointment`)  
- Joi + dynamic form validation on many write paths  
- Dockerfiles and compose skeleton with healthchecks  
- Migration documentation (`backend/docs/MIGRATIONS.md`)

---

## 4. Out of scope (later phases)

Inpatient, ward, lab LIS, radiology, insurance, inventory, AI, telemedicine, new clinical modules.

---

## 5. Estimated readiness movement

| Area | Current (approx) | After Phase 1 Critical+High |
|------|------------------|-----------------------------|
| Security | 48 | ~78–85 |
| Audit | 35 | ~75 |
| Reporting foundation | 42 | ~65 |
| Performance | 55 | ~72 |
| Deployment | 58 | ~80 |
| **Overall** | **~62** | **~85–88** if Critical+High completed |

---

*Next: see `docs/PRODUCTION_HARDENING_PHASE1_BACKLOG.md` for ordered implementation tasks. Await approval before code changes.*
