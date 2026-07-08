# Collaboration Service

Document collaboration for MoM applications (ONLYOFFICE integration).

## Architecture (current)

| Component | Role | Port / path |
|-----------|------|-------------|
| **Main backend** (`backend/app.js`) | Hosts collaboration routes at `/api/v1/documents/*`, auth, plan policy | `4000` (dev) / `/api` (Nginx) |
| **collaboration-service/** | Library mounted in-process via `collaborationIntegration.js` | Not a separate HTTP service in production |
| **ONLYOFFICE Document Server** | Browser editor engine | `8080` (dev) / `/onlyoffice` (Nginx) |
| **collaboration_service** DB | Document metadata + grants | Same Postgres host, separate database |

## Local development (npm run dev)

### 1. Start ONLYOFFICE

```bash
cd collaboration-service
cp .env.example .env
npm run onlyoffice:up
```

Or use the root stack (see below).

### 2. Create collaboration database

```bash
cd collaboration-service
npm install
npm run db:create
npm run migrate
```

### 3. Run the main backend (collaboration is integrated)

```bash
cd backend
npm run dev
```

Routes: `http://localhost:4000/api/v1/documents`

Set in `frontend/.env.local`:

```
NEXT_PUBLIC_COLLABORATION_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_ONLYOFFICE_URL=http://localhost:8080
```

## Docker deployment (production-like)

From the **repository root**:

```bash
cp .env.example .env
docker compose up -d --build
```

| URL | Service |
|-----|---------|
| `http://localhost/` | Frontend |
| `http://localhost/api/` | Backend API |
| `http://localhost/api/v1/documents` | Collaboration (integrated) |
| `http://localhost/onlyoffice/` | ONLYOFFICE Document Server |

Direct ports (no Nginx): `docker compose -f docker-compose.yml -f docker-compose.direct.yml up -d --build --scale nginx=0`

The standalone `collaboration-service/docker-compose.yml` is **ONLYOFFICE only** for local dev when not using the root stack.

## Environment

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Must match the main backend `JWT_SECRET` |
| `COLLABORATION_PUBLIC_URL` | URL ONLYOFFICE uses to fetch/save files. Docker: `http://backend:4000`. Local ONLYOFFICE in Docker: `http://host.docker.internal:4000` |
| `ONLYOFFICE_URL` | Browser-facing Document Server URL. Nginx: `http://localhost/onlyoffice`. Dev: `http://localhost:8080` |
| `ONLYOFFICE_JWT_SECRET` | Signs editor config when `ONLYOFFICE_JWT_ENABLED=true` |
| `COLLABORATION_DB_NAME` | Separate database (default `collaboration_service`) |
| `FILE_TOKEN_SECRET` | Short-lived tokens for ONLYOFFICE file/callback URLs |
| `DOCUMENT_STORAGE_PATH` | On-disk document files (Docker volume in compose) |

## API (v1)

All user endpoints require `Authorization: Bearer <main-app-jwt>`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/documents` | List documents |
| `POST` | `/api/v1/documents` | Create document |
| `GET` | `/api/v1/documents/:id/editor-session` | ONLYOFFICE config for current user |
| `POST` | `/api/v1/documents/:id/callback?token=...` | ONLYOFFICE save callback (internal) |
| `GET` | `/api/v1/documents/:id/file?token=...` | ONLYOFFICE file download (internal) |

## Troubleshooting

### Editor: connection refused on port 8080

ONLYOFFICE is not running. Start Docker Desktop, then `cd collaboration-service && npm run onlyoffice:up`.

### Editor opens but shows "Download failed"

ONLYOFFICE fetches files from `COLLABORATION_PUBLIC_URL`. In Docker this must be reachable from the ONLYOFFICE container (`http://backend:4000` on the compose network).

### Existing Postgres volume (no collaboration_service database)

If Postgres was created before this update, create the database manually:

```sql
CREATE DATABASE collaboration_service;
```

Then restart the backend container to run collaboration migrations.
