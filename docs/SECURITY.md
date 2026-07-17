# NovaCure — Security

## Authentication

- Staff/patient/pharmacy login via `POST /api/auth/login` returns a JWT.
- Default JWT TTL is **12h** (`JWT_EXPIRES_IN`). NextAuth session may be longer; API calls fail when the JWT expires or is revoked.
- JWT payload includes `user_id`, `account_type`, `is_first_logged_in`, and `token_version`.

## Password policy

- **New** passwords (change / OTP reset / staff create): minimum **12** characters (`backend/utils/passwordPolicy.js`).
- Login validation remains shorter so legacy passwords can still authenticate until changed.
- First login: `is_first_logged_in=true` blocks most API routes until `PUT /api/change-password` succeeds (`PASSWORD_CHANGE_REQUIRED`).
- Admin password reset forces `is_first_logged_in=true` and bumps `token_version`.

## Session revocation

- `users.token_version` increments on password change, OTP reset, admin reset, and authenticated logout.
- Tokens with a mismatched `token_version` receive `401 TOKEN_REVOKED`.

## Rate limiting

- Login: 30 / 15 minutes (`authLoginLimiter`).
- Forgot-password OTP/reset: 20 / 15 minutes (`passwordResetLimiter`).

## Attachments

- Upload requires authentication **and** upload eligibility (`attachments:create` or clinical/portal roles).
- List/download/delete enforce **permission + ownership** via `attachmentAccessService` (uploader, patient self, appointment access, pharmacy forward, or `attachments:manage`).
- Unauthorized download/delete returns **404** (does not confirm existence).
- Optional linkage: `resource_type`, `resource_id`, `patient_id` (set on upload or backfilled from workflow/pharmacy).
- Files under `/uploads/attachments` are not publicly served; use `GET /api/attachments/:id/file` (Bearer or `?token=`).

## Production secrets

- `JWT_SECRET` must be ≥32 characters when `NODE_ENV=production` (fail-fast).
- Production also rejects weak `DB_PASSWORD` defaults (`root`, `postgres`, `password`, …).
- Docker Compose requires `JWT_SECRET`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, and `POSTGRES_PASSWORD`.

See also: `docs/DEPLOYMENT.md`, `docs/AUDIT.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCTION_CHECKLIST.md`.
