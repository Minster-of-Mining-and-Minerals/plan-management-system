# NovaCure — Phase 1 Production Hardening Backlog

**Status:** Phase 1 closeout July 2026 — Waves A–D plus attachment IDOR fix, security regression suite, audit export, live dashboard, production secret externalization.  
**Order:** Implement top-to-bottom. Do not skip Critical items.  
**Constraint:** No new clinical modules; preserve existing workflows and API compatibility.

Complexity: **S** ≤0.5d | **M** 0.5–2d | **L** 2–5d | **XL** >5d

---

## CRITICAL (implement first)

### C1 — Authenticate and authorize RBAC routers
- **Description:** Apply `authenticateToken` + `requireInternalAccount` + `checkPermission` to roles, permissions, permission-groups, user-roles. Keep existing route shapes.
- **Reason:** Unauthenticated RBAC = total compromise (S-01…S-04).
- **Files:** `roleRoutes.js`, `permissionRoutes.js`, `permissionGroupRoutes.js`, `userRoleRoutes.js`, possibly seed missing permission actions if needed.
- **Complexity:** S  
- **Risk:** Low (wiring only); High if wrong permission keys block admins — verify Super Admin / existing admin groups.
- **Dependencies:** None  
- **Outcome:** RBAC APIs require authz.

### C2 — Secure attachments and stop public PHI file serving
- **Description:** Auth + permission on attachment routes; serve files via authenticated endpoint; remove or gate public `/uploads` for attachments; stop returning raw FS paths to clients.
- **Reason:** S-05, S-15 Critical PHI/malware.
- **Files:** `attachmentRoute.js`, `attachmentController.js`, `app.js`, frontend upload URL helpers if needed.
- **Complexity:** M  
- **Risk:** Medium — existing clients using `/uploads/...` URLs must switch to authenticated URLs (document migration).
- **Dependencies:** None  
- **Outcome:** Files only via auth.

### C3 — Protect branding mutations and dashboard
- **Description:** Keep `GET /branding/active` public; auth all other branding routes; restore dashboard auth + `dashboard:view`.
- **Reason:** S-06, S-09.
- **Files:** `brandingRoutes.js`, `dashboardRoutes.js`
- **Complexity:** S  
- **Risk:** Low (login page branding must keep working).
- **Dependencies:** None  
- **Outcome:** No anonymous admin/ops APIs.

### C4 — Production secrets & env fail-fast
- **Description:** Align JWT env names; require `JWT_SECRET` (min length) in production; fix `docker-compose` secrets (no defaults in prod docs); rename/complete frontend `.env.example`.
- **Reason:** S-08, D-01, D-06.
- **Files:** `authController.js`, `authMiddleware.js`, `docker-compose.yml`, `backend/.env.example`, `frontend/example.env` → `.env.example`, startup bootstrap.
- **Complexity:** S  
- **Risk:** Low if documented; Medium if local setups break — provide `.env.example` defaults for *development only*.
- **Dependencies:** None  
- **Outcome:** Unsafe deploy fails loudly.

### C5 — Remove hardcoded internal user password `"password"`
- **Description:** Use `generateRandomPassword()`; return/show once to creator; enforce first-login change.
- **Reason:** S-07.
- **Files:** `userController.js`, `utils/password.js`
- **Complexity:** S  
- **Risk:** Low; creators must copy temp password (UI toast already may exist — verify).
- **Dependencies:** C8 helpful for first-login backend gate  
- **Outcome:** No known default staff passwords.

### C6 — Minimal automated smoke tests + CI skeleton
- **Description:** Add Vitest/Jest + Supertest: login, unauthenticated RBAC returns 401, health, one cashier permission negative test. GH Actions: lint, build, test.
- **Reason:** T-01, T-02 Critical.
- **Files:** new `backend/tests/**`, `package.json` scripts, `.github/workflows/ci.yml`
- **Complexity:** M  
- **Risk:** Low  
- **Dependencies:** C1–C3 for meaningful 401 assertions  
- **Outcome:** Regression gate exists.

---

## HIGH

### H1 — Rate limiting on auth and password reset
- **Description:** Rate-limit login, OTP request/verify/reset; optional account lockout counter.
- **Reason:** S-12.
- **Files:** `app.js`, auth/forgot-password routers; new middleware.
- **Complexity:** S  
- **Risk:** Low (tune limits for clinic NAT).
- **Dependencies:** None  
- **Outcome:** Brute force mitigated.

### H2 — Helmet + production CORS + Swagger lockdown
- **Description:** Add helmet; strict CORS allowlist in production; disable or protect `/api-docs` when `NODE_ENV=production`.
- **Reason:** S-20, S-21, S-22.
- **Files:** `app.js`, `package.json`
- **Complexity:** S  
- **Risk:** Low (CORS misconfig could break frontend — test).
- **Dependencies:** C4  
- **Outcome:** Baseline HTTP hardening.

### H3 — User / form-field permission gaps
- **Description:** Add missing `checkPermission` on user list/get/delete/toggle/reset-password and all form-field routes.
- **Reason:** S-10, S-11.
- **Files:** `userRoutes.js`, `formFieldRoutes.js`, `formFieldGroupRoutes.js`
- **Complexity:** S  
- **Risk:** Medium — verify reception/admin groups still have needed perms.
- **Dependencies:** None  
- **Outcome:** Least privilege for staff admin.

### H4 — Portal isolation middleware prefixes
- **Description:** Add `/billing`, `/finance`, `/notifications`, `/medical-diagrams`, `/clinical-suggestions`, `/user-titles` to internal prefixes (or invert to default-deny).
- **Reason:** S-23.
- **Files:** `frontend/src/middleware.ts`
- **Complexity:** S  
- **Risk:** Low  
- **Dependencies:** None  
- **Outcome:** Edge portal isolation complete.

### H5 — Socket.IO JWT authentication
- **Description:** Authenticate socket handshake with Bearer/cookie JWT; map `onlineUsers` from verified `user_id`.
- **Reason:** S-13.
- **Files:** `app.js`, frontend socket client if any.
- **Complexity:** M  
- **Risk:** Medium — notifications may need client update.
- **Dependencies:** C4  
- **Outcome:** No spoofed sockets.

### H6 — Appointment ownership on billing APIs
- **Description:** Call `canAccessAppointment` (or equivalent) before billing context/mutations unless user has manage-all billing permission.
- **Reason:** S-14.
- **Files:** `appointmentBillingService.js`, controller.
- **Complexity:** M  
- **Risk:** Medium — cashiers/finance may need explicit bypass permission.
- **Dependencies:** Clarify product rule (ask owner)  
- **Outcome:** No billing IDOR.

### H7 — Authenticated file download helper (frontend)
- **Description:** Update upload/display components to use authenticated attachment URLs after C2.
- **Reason:** Keep UX after C2.
- **Files:** `FileUploadField`, `FileView`, attachment API, any print/prescription image paths.
- **Complexity:** M  
- **Risk:** Medium  
- **Dependencies:** C2  
- **Outcome:** Files still open in UI.

### H8 — SQL pagination for hot lists
- **Description:** Push filter/sort/limit into SQL for patients, users, cashier queue, payments/today/history/collections, workflow inbox, staff appointments. Preserve response shape where possible (`total`, `results`, etc.).
- **Reason:** R-04, P-01, P-05.
- **Files:** patient/user controllers, `cashierPaymentService`, `medicalWorkflowService`, `appointmentService`
- **Complexity:** L  
- **Risk:** Medium — frontend must pass page params consistently.
- **Dependencies:** None  
- **Outcome:** Lists scale.

### H9 — Cashier payment indexes + queue N+1 fix
- **Description:** Migration indexes on `cashier_payments`; batch latest collection request in queue query.
- **Reason:** P-02, P-04.
- **Files:** new migration, `cashierPaymentService.js`
- **Complexity:** M  
- **Risk:** Low  
- **Dependencies:** None  
- **Outcome:** Faster cashier desk.

### H10 — Efficient `listUsersWithPermission`
- **Description:** Replace full-user scan with SQL join / subquery; keep API of helper.
- **Reason:** P-03.
- **Files:** `userPermissionService.js`
- **Complexity:** M  
- **Risk:** Medium (permission resolution edge cases).
- **Dependencies:** None  
- **Outcome:** Faster notify/receivers.

### H11 — Audit log read API + permission + Audit Explorer UI
- **Description:** Seed `audit_log:view`; `GET /api/audit-logs` with filters/pagination; internal page under admin nav.
- **Reason:** A-02; reporting foundation for compliance.
- **Files:** migration/seed, new router/controller/service, frontend feature + nav.
- **Complexity:** L  
- **Risk:** Low  
- **Dependencies:** Prefer after H14 expands writers  
- **Outcome:** Auditors can search events.

### H12 — Expand audit write coverage (compatible)
- **Description:** Add `logAudit` for: login success/fail, logout, password change/reset, role/permission-group changes, workflow actions, send-to-cashier, voids already present, attachment upload/delete, receipt reprint if applicable. Store rich `details` JSON (before/after when available, userAgent).
- **Reason:** A-01, A-04.
- **Files:** auth, RBAC controllers, workflow, billingCollection, attachments, etc.
- **Complexity:** L  
- **Risk:** Low performance cost; keep fire-and-forget except payments.
- **Dependencies:** None (can ship before H11)
- **Outcome:** Meaningful audit trail.

### H13 — Structured logging + request ID + graceful shutdown
- **Description:** Adopt pino (or extend existing logger) for JSON stdout; request-id middleware; SIGTERM drain for HTTP + Socket.IO + Sequelize.
- **Reason:** D-02, D-05.
- **Files:** `app.js`, `utils/logger.js`, new middleware.
- **Complexity:** M  
- **Risk:** Low  
- **Dependencies:** None  
- **Outcome:** Operable production process.

### H14 — Docker migrate-on-start + backup runbook
- **Description:** Entrypoint `npx sequelize-cli db:migrate && node app.js`; document `pg_dump` / restore / uploads volume in `docs/DEPLOYMENT.md`.
- **Reason:** D-03, D-04.
- **Files:** `backend/Dockerfile`, `docs/DEPLOYMENT.md` (new)
- **Complexity:** S–M  
- **Risk:** Medium — migrate failures should fail container start (desired).
- **Dependencies:** C4  
- **Outcome:** Deployable stack with DR docs.

### H15 — Backend first-login enforcement + password policy
- **Description:** Reject API calls when `is_first_logged_in` except change-password/logout; unify min length ≥12 server-side; CSPRNG OTP.
- **Reason:** S-18, S-19, S-25.
- **Files:** `authMiddleware.js`, password validators/controllers.
- **Complexity:** M  
- **Risk:** Medium — existing short passwords may need reset on deploy.
- **Dependencies:** C5  
- **Outcome:** Default passwords cannot call APIs.

---

## MEDIUM

### M1 — JWT short TTL + logout/password-change revocation strategy
- **Description:** Prefer access TTL ≤12h; optional Redis/jti denylist for logout; bump `token_version` on password change if Redis unavailable.
- **Reason:** S-16, S-17.
- **Files:** auth stack; maybe User.token_version column.
- **Complexity:** M–L  
- **Risk:** Medium (sessions invalidate).
- **Dependencies:** C4  
- **Outcome:** Stolen tokens limited.

### M2 — Server-side collections export
- **Description:** `GET /collections/export` streams CSV for full date range under permission.
- **Reason:** R-01.
- **Files:** cashier routes/service, DailyCollectionsPage.
- **Complexity:** M  
- **Risk:** Low  
- **Dependencies:** H8 preferred  
- **Outcome:** Complete finance exports.

### M3 — Dashboard honesty
- **Description:** Label mock widgets or replace with real counts already available (patients, payments today, open sessions).
- **Reason:** R-02.
- **Files:** `AdminDashboardPage.tsx`, `dashboardService.js`
- **Complexity:** M  
- **Risk:** Low  
- **Dependencies:** Dashboard auth (C3)  
- **Outcome:** No fake KPIs mistaken for real.

### M4 — Shared list/pagination utility
- **Description:** Standardize `{ page, limit, total, results }` helpers backend + RTK query params.
- **Reason:** Reporting foundation / DRY.
- **Files:** `utils/pagination.js` (extend), frontend list pages.
- **Complexity:** M  
- **Risk:** Low  
- **Dependencies:** H8  
- **Outcome:** Consistent lists.

### M5 — Branding / form-config short TTL cache
- **Description:** In-memory cache for active branding and permission resolution per request lifecycle.
- **Reason:** P-06.
- **Files:** branding service, auth middleware.
- **Complexity:** S  
- **Risk:** Low (invalidate on update).
- **Dependencies:** None  
- **Outcome:** Fewer repeated queries.

### M6 — Production checklist & security/permission docs
- **Description:** Write `docs/SECURITY.md`, `docs/PERMISSIONS.md`, `docs/AUDIT.md`, `docs/PRODUCTION_CHECKLIST.md`.
- **Reason:** Step 9 documentation.
- **Files:** `docs/**`
- **Complexity:** S  
- **Risk:** None  
- **Dependencies:** After Critical/High land  
- **Outcome:** Ops can run go-live checklist.

### M7 — Generic production error responses
- **Description:** Hide `err.message` from clients when `NODE_ENV=production`; keep logs detailed.
- **Reason:** S-24.
- **Files:** `app.js`, key controllers.
- **Complexity:** S  
- **Risk:** Low  
- **Dependencies:** H13  
- **Outcome:** Less info leakage.

### M8 — Socket.IO behind same origin / proxy docs
- **Description:** Document or attach Socket.IO to main HTTP server for nginx simplicity.
- **Reason:** D-07.
- **Files:** `app.js`, `docs/DEPLOYMENT.md`
- **Complexity:** M  
- **Risk:** Medium  
- **Dependencies:** H5  
- **Outcome:** Realtime works in proxied prod.

---

## LOW

### L1 — Seed safety: refuse default demo passwords when `NODE_ENV=production`
- **Complexity:** S | **Risk:** Low | Blocks accidental prod seed with `password`.

### L2 — Health readiness: optional DB migration lag check
- **Complexity:** S | **Risk:** Low

### L3 — Audit retention note / optional archive job design (implement later)
- **Complexity:** S (doc) | **Risk:** None

### L4 — Remove or quarantine dead `patients:export` until implemented
- **Complexity:** S | **Risk:** Low

---

## Implementation waves (recommended)

| Wave | Tasks | Target readiness lift |
|------|-------|------------------------|
| **Wave A — Lock the doors** | C1–C5, H1–H4 | Security ~48→75 |
| **Wave B — Make it operable** | C6, H13–H14, H8–H10, H9 | Deploy/perf ~55–58→75 |
| **Wave C — Compliance trail** | H11–H12, H15, M1–M2, M6 | Audit/reporting ~35–42→75 |
| **Wave D — Polish** | H5–H7, M3–M5, M7–M8, Low | Overall → **≥85** |

---

## Approval gates

1. **Approve Wave A** before any code (security locks).  
2. Confirm **H6 product rule:** Should finance/cashiers with billing permissions bypass appointment ownership?  
3. Confirm **password policy:** minimum length (recommend 12) and whether existing users must reset.  
4. Confirm **attachment URL breaking change** is acceptable (authenticated downloads).

---

## Explicitly deferred (not Phase 1)

Inpatient, ward, lab/radiology orders, insurance, inventory, AI, telemedicine, refresh-token full redesign (unless needed for M1), multi-facility tenancy.

---

*Audit detail: `docs/PRODUCTION_HARDENING_PHASE1_AUDIT.md`*
