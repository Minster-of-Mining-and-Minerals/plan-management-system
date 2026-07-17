# NovaCure — Production checklist

Use before go-live. Pair with `docs/DEPLOYMENT.md` and `docs/SECURITY.md`.

## Secrets & env

- [ ] `JWT_SECRET` ≥32 chars (unique per environment)
- [ ] `AUTH_SECRET` / `NEXTAUTH_SECRET` set for web
- [ ] DB credentials not default `root` in production
- [ ] `FRONTEND_URL` / `NEXT_PUBLIC_*` point at real origins
- [ ] Email SMTP credentials configured for OTP / temp passwords
- [ ] Swagger disabled unless `ENABLE_SWAGGER=true`

## Database

- [ ] `npx sequelize-cli db:migrate` succeeds (or Docker entrypoint migrate)
- [ ] Migrations include cashier indexes + `token_version` + `audit_log:view`
- [ ] **Do not** run demo seeders with password `password` in production
- [ ] Backup: `pg_dump` + `uploads/` volume schedule documented

## Security smoke

- [ ] Unauthenticated `GET /api/roles` → 401
- [ ] Unauthenticated attachment upload → 401
- [ ] Attachment download/delete for another user's file → 404 (no existence leak)
- [ ] `/uploads/attachments/*` blocked
- [ ] `POSTGRES_PASSWORD` / `DB_PASSWORD` not `root` (compose + API fail-fast)
- [ ] First-login user cannot hit clinical APIs until password change
- [ ] Password change requires ≥12 characters
- [ ] Collections CSV export works for finance role
- [ ] Audit explorer + CSV export visible only with `AUDIT_LOG:VIEW`
- [ ] Admin dashboard KPIs from `/api/dashboard/stats` only (no mock fallbacks)
- [ ] `npm run test:smoke` and `npm run test:security` pass

## Ops

- [ ] Healthcheck `GET /api/health` green
- [ ] Graceful stop (`docker compose stop` / SIGTERM) drains connections
- [ ] Socket.IO port proxied if realtime is required
- [ ] CI green (`.github/workflows/ci.yml`)

## People

- [ ] Super Admin / Admin accounts use unique strong passwords
- [ ] Cashiers trained on Accept / Pay / void SOP (`docs/CASHIER_SOP.md`)
- [ ] Incident contact + restore drill completed once
