# NovaCure — Deployment & operations

## Stack

| Service | Role | Default ports |
|---------|------|----------------|
| `postgres` | PostgreSQL 16 | 5432 |
| `api` | Express API + Socket.IO (separate port) | 4000 (HTTP), 5000 (Socket.IO) |
| `web` | Next.js frontend | 3000 |
| `nginx` | Reverse proxy (optional) | 80 |

Compose files: `docker-compose.yml`, `docker-compose.proxy.yml` (public URLs on port 80).

## Required secrets

Set these in the shell environment or a `.env` next to compose **before** `docker compose up`:

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
export AUTH_SECRET="$(openssl rand -hex 32)"
export NEXTAUTH_SECRET="$AUTH_SECRET"
```

Production API refuses to start if `JWT_SECRET` is missing or shorter than 32 characters.

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
# Backup
docker compose exec -T postgres pg_dump -U postgres -d novadb -Fc > novacure-$(date +%Y%m%d).dump

# Restore (destructive to target DB)
docker compose exec -T postgres pg_restore -U postgres -d novadb --clean --if-exists < novacure-YYYYMMDD.dump
```

Logical SQL dump alternative:

```bash
docker compose exec -T postgres pg_dump -U postgres -d novadb > novacure.sql
```

## Health checks

- API: `GET /api/health` → `{ status: "ok", database: "connected" }`
- Compose healthchecks already probe API and web.

## Socket.IO

Realtime uses a **separate** HTTP server on `SOCKET_PORT` (default 5000). Nginx must proxy both `/` → web/api and the Socket.IO path/port. See `nginx/` and Wave D (M8) for same-origin Socket.IO attachment.

## Graceful shutdown

API handles `SIGTERM`/`SIGINT`: stop accepting connections, close HTTP + Socket.IO, close Sequelize. Prefer `docker compose stop` / orchestrator SIGTERM over `kill -9`.

## Rollback migrations

```bash
docker compose exec api npx sequelize-cli db:migrate:undo
```

Prefer forward-fix migrations in production when possible.
