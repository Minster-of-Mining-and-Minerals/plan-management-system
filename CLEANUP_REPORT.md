# NovaCure Platform — Cleanup & Stabilization Report

**Date:** May 2026  
**Status:** Frontend production build passes. Backend starts and connects to PostgreSQL. Migrations apply successfully.

---

## Removed packages

### Backend (`novacure-platform-api`)

| Package | Reason |
|---------|--------|
| `body-parser` | Redundant with Express 5 built-in JSON/urlencoded |
| `knex` | Unused (Sequelize is the ORM) |
| `mysql2` | Unused (PostgreSQL only) |
| `express-validator` | Unused (Joi validators used) |
| `node-cron` | Unused |
| `twilio` | Unused |
| `smpp` | Unused |

Also removed: `backend/knexfile.js` (orphaned Knex config).

**Moved to devDependencies:** `nodemon`

**Added:** `uuid` (explicit dependency; used across controllers)

### Frontend (`novacure-platform-web`)

| Package | Reason |
|---------|--------|
| `radix-ui` (umbrella meta) | Replaced by `@radix-ui/react-switch` |
| `react-toastify` | Consolidated on `sonner` (already in layout) |
| `@tailwindcss/typography` | Moved to `devDependencies` (Tailwind plugin only) |

**~85 transitive packages** removed from `node_modules` after frontend prune.

---

## Replaced / consolidated

| Before | After |
|--------|--------|
| `react-toastify` on auth pages | `sonner` (matches rest of app) |
| `radix-ui` Switch import | `@radix-ui/react-switch` |
| Duplicate toast systems | Single `sonner` Toaster in layout |
| `body-parser` + `express.json` | `express.json` + `express.urlencoded` only |
| `PermissionMatrix` type vs component name clash | Type renamed to `PermissionMatrixMap` |
| `JSX.Element` icon types | `React.ReactNode` |
| Invalid `Badge` `status` prop | `variant="default" \| "destructive"` |
| Home page client `useTranslations` | Server `getTranslations` (fixes RSC) |
| Empty `(public)/page.tsx` | **Deleted** (blocked build) |

---

## Fixed runtime / build issues

### Backend

- **Sequelize `db:create` crash** — `database` was `undefined` when CLI did not load `.env`. Fixed with `backend/.sequelizerc` + explicit dotenv path in `config/config.js`.
- **DB port type** — `DB_PORT` coerced with `Number()` for Sequelize.
- **Models bootstrap** — Clear error if `DB_NAME` / config missing; respects `DATABASE_URL`.
- **CORS** — Restricted in production to `allowedOrigins`; permissive in development.
- **Dashboard API** — Registered `/api/dashboard` (routes existed but were not mounted).
- **Email sender fallback** — Uses `PLATFORM_NAME` when `APP_NAME` unset.

### Frontend

- **Production build failed** — Multiple TypeScript errors resolved (see above).
- **Permissions hook** — `normalizeToPermissionKeys()` for API permission strings.
- **User table pagination** — Client-side slice (API returns full list, no `meta` yet).
- **Locale switcher** — Type-safe locale guard for `en` / `am`.
- **Middleware** — Removed debug `console.log` spam.
- **Missing `UserType`** — Added to `redux/types/user.ts`.
- **DataTable** — Added optional `isLoading` prop (both table implementations).

### Infrastructure

- Added **`docker-compose.yml`** (Postgres + API + Web).
- Added **`backend/Dockerfile`**, **`frontend/Dockerfile`**, `.dockerignore` files.
- Frontend **`output: "standalone"`** for container deployment.

---

## Validation results

| Check | Result |
|-------|--------|
| `npm run build` (frontend) | **Pass** |
| `npm run migrate` (backend) | **Pass** |
| `npm run db:create` (backend) | **Pass** (with `.sequelizerc`) |
| `npm run seed` (backend) | Skips/fails if demo users already exist (expected on re-run) |
| Backend `app.js` load | **Pass** (DB connects) |

---

## Remaining technical debt

1. **Next.js 16 middleware deprecation** — Build warns to migrate `middleware.ts` → `proxy` convention when Next documents stable migration path.
2. **`baseline-browser-mapping` age warning** — Dev dependency added; warning may persist until package data refreshes upstream.
3. **npm audit vulnerabilities** — Backend ~18, Frontend ~13 (mostly transitive). Run `npm audit` and upgrade deliberately; avoid blind `--force`.
4. **Server-side user pagination** — Frontend paginates in memory; backend `getUsers` ignores `page`/`limit` query params.
5. **Duplicate `DataTable` components** — `tableList/DataTable.tsx` and `component/DataTable.tsx` should be merged long-term.
6. **Docker production** — API container needs env secrets (`JWT_SECRET`, email) via compose overrides; web needs real `AUTH_SECRET` / `NEXTAUTH_SECRET`.
7. **Seed idempotency** — Demo user seeder does not upsert; re-seeding fails if users exist.
8. **Socket.IO** — Still runs on port 5000; ensure firewall/proxy rules if deploying.

---

## Recommended future upgrades

- Upgrade **Next.js** to latest 16.x patch when available; adopt **proxy** API for i18n auth routing.
- Add **server-side pagination** to `/api/users` with consistent `{ data, meta }` responses.
- Consolidate **DataTable** into one module under `components/data-table/`.
- Add **CI pipeline** (lint, `next build`, migrate check, smoke test).
- Replace **next-auth beta** with stable v5 when released for your adapter setup.
- Add **health check** endpoints: `GET /api/health` for API and Postgres readiness in Docker.
- Run **`npm audit fix`** in a dedicated PR after reviewing breaking changes.

---

## Quick start (after cleanup)

```bash
# Database (Docker)
docker compose up -d postgres

# Backend
cd backend
npm install
npm run migrate
npm run seed   # first time only
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

**Demo login** (if seed succeeded): see `backend/seeders/20251108201545-demo-users.js`.
