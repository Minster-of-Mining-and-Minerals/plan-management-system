# NovaCure — Deployment & operations

## Stack

| Service | Role | Default ports |
|---------|------|----------------|
| `postgres` | PostgreSQL 16 | 5432 |
| `api` | Express API + Socket.IO (same HTTP server) | 4000 |
| `web` | Next.js frontend | 3000 |
| `nginx` | Reverse proxy (optional) | 80 |

Compose files: `docker-compose.yml`, `docker-compose.proxy.yml` (public URLs on port 80).

## Required secrets

Set these in the shell environment or a `.env` next to compose **before** `docker compose up`:

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
export AUTH_SECRET="$(openssl rand -hex 32)"
export NEXTAUTH_SECRET="$AUTH_SECRET"
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
# optional overrides
export POSTGRES_USER=postgres
export POSTGRES_DB=novadb
export TZ=Africa/Addis_Ababa
export FRONTEND_URL=http://localhost:3000
```

Production API refuses to start if:

- `JWT_SECRET` is missing or shorter than 32 characters
- `DB_PASSWORD` is an unsafe default (`root`, `postgres`, `password`, …)

Compose will not start without `POSTGRES_PASSWORD`, `JWT_SECRET`, and web `AUTH_SECRET` / `NEXTAUTH_SECRET`.

## First boot

```bash
docker compose up -d --build
```

The API container runs `npx sequelize-cli db:migrate` then `node app.js` (see `backend/docker-entrypoint.sh`). Migration failure exits the container (desired).

Seed data (dev/demo only — do **not** seed production with demo passwords):

```bash
docker compose exec api npx sequelize-cli db:seed:all
```

## Uploads volume

PHI and diagram files live under `backend/uploads`, mounted as:

```yaml
volumes:
  - ./backend/uploads:/app/uploads
```

Back up this directory with the database. Attachment PHI under `uploads/attachments/` is not publicly served; clients use `GET /api/attachments/:id/file` with auth.

## Database backup / restore

```bash
# Backup (custom format)
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > novacure-$(date +%Y%m%d).dump

# Restore (destructive to target DB)
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < novacure-YYYYMMDD.dump
```

Logical SQL dump alternative:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > novacure.sql
```

### Uploads backup

```bash
tar -czf novacure-uploads-$(date +%Y%m%d).tgz -C ./backend uploads
```

Restore uploads by extracting into `backend/uploads` (or the compose volume mount path) **after** DB restore so attachment rows and files match.

## Disaster recovery (DR)

**RPO target (recommended):** ≤ 24h with nightly DB + uploads backups; tighten if clinically required.  
**RTO target (recommended):** ≤ 4h for single-host compose restore.

### Recovery steps

1. Provision host with Docker + compose files + `.env` secrets (new `JWT_SECRET` only if keys were compromised — otherwise restore same secrets so existing sessions/JWTs behave consistently during cutover).
2. Start **postgres only**; restore dump (`pg_restore` / `psql`).
3. Restore `uploads/` tree to the API volume path.
4. Start `api` (entrypoint runs migrations — forward-only; do not undo on prod without a plan).
5. Start `web` (+ `nginx` if used). Verify `GET /api/health`.
6. Smoke: login, open audit explorer, download a known attachment, take a test payment in non-prod first.

### Migration compatibility

- Always restore onto a DB that will run the **same or newer** migration set as the dump’s application version.
- Prefer restoring backup → run `db:migrate` to catch up, rather than migrating down.
- Keep dump + uploads + git tag (or image digests) as one restore set.

### Validation drill (quarterly)

1. Restore dump + uploads to a staging compose stack.
2. Confirm row counts (users, patients, payments) and spot-check attachment download.
3. Record time taken (RTO practice) and gaps.

## Health checks

- API: `GET /api/health` → `{ status: "ok", database: "connected" }`
- Compose healthchecks already probe API and web.

## Socket.IO

Realtime is attached to the **same** HTTP server as the REST API (`PORT`, default 4000), path `/socket.io`. Clients must send a JWT via `auth.token`, `Authorization: Bearer`, or `?token=`.

Nginx proxies `/socket.io/` to `novacure_api` with WebSocket headers (`nginx/snippets/app-locations.conf`). No separate Socket.IO port is required.

## Graceful shutdown

API handles `SIGTERM`/`SIGINT`: stop accepting connections, close HTTP + Socket.IO, close Sequelize. Prefer `docker compose stop` / orchestrator SIGTERM over `kill -9`.

## Rollback migrations

```bash
docker compose exec api npx sequelize-cli db:migrate:undo
```

Prefer forward-fix migrations in production when possible.
