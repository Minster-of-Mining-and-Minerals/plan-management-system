# Collaboration Service

Standalone ONLYOFFICE collaboration microservice for MoM applications.

## Architecture

- **collaboration-service** (port `4100`) — document metadata, file storage, editor sessions, ONLYOFFICE callbacks
- **ONLYOFFICE Document Server** (port `8080`) — real-time co-editing engine
- **plan-management backend** (port `4000`) — user auth (shared JWT) and plan access policy

## Quick start

### 1. Start ONLYOFFICE

```bash
cd collaboration-service
cp .env.example .env
# Set ONLYOFFICE_JWT_SECRET in .env (must match docker-compose)
docker compose up -d
```

### 2. Create collaboration database

```bash
npm install
npm run db:create
npm run migrate
```

### 3. Run the service

```bash
npm run dev
```

Service health check: `GET http://localhost:4100/health`

## Environment

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Must match the main backend `JWT_SECRET` |
| `COLLABORATION_PUBLIC_URL` | URL ONLYOFFICE uses to fetch/save files. Use `http://host.docker.internal:4100` when ONLYOFFICE runs in Docker |
| `PLAN_API_URL` | Main app API base, e.g. `http://localhost:4000/api` |
| `ONLYOFFICE_URL` | Browser-facing Document Server URL, e.g. `http://localhost:8080` |
| `ONLYOFFICE_JWT_SECRET` | Signs editor config (must match Document Server) |

## API (v1)

All user endpoints require `Authorization: Bearer <main-app-jwt>`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/documents` | List documents (`?ownerType=plan_version&ownerId=...`) |
| `POST` | `/api/v1/documents` | Create document (JSON or multipart with `file`) |
| `GET` | `/api/v1/documents/:id` | Document metadata |
| `DELETE` | `/api/v1/documents/:id` | Delete document |
| `GET` | `/api/v1/documents/:id/editor-session` | ONLYOFFICE config for current user |
| `GET` | `/api/v1/documents/:id/versions` | List saved versions |
| `GET` | `/api/v1/documents/:id/versions/:versionNumber/editor-session` | Read-only ONLYOFFICE preview for a version |
| `GET` | `/api/v1/documents/:id/versions/:versionNumber/onlyoffice-file?token=...` | ONLYOFFICE download for version snapshot |
| `GET` | `/api/v1/documents/:id/versions/:versionNumber/file` | Download a specific version |
| `POST` | `/api/v1/documents/:id/versions/:versionNumber/restore` | Restore version as new current version |
| `PATCH` | `/api/v1/documents/:id/status` | Finalize (`finalized`) or reopen (`draft`) |

ONLYOFFICE internal endpoints (short-lived token in query string):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/documents/:id/file?token=...` | File download |
| `POST` | `/api/v1/documents/:id/callback?token=...` | Save callback |

## Create document example

```bash
curl -X POST http://localhost:4100/api/v1/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Annual Plan Report",
    "ownerApp": "plan-management",
    "ownerType": "plan_version",
    "ownerId": "PLAN_VERSION_UUID"
  }'
```

## Co-editing

Multiple users open the same document via `GET /editor-session`. Each session uses the same `document.key` with their own `user.id` and `user.name` from the main app profile.

## Frontend

Set in `frontend/.env.local`:

```
NEXT_PUBLIC_COLLABORATION_API_URL=http://localhost:4100/api/v1
```

## Policy rules

| Owner | Read | Edit | Create | Delete |
|-------|------|------|--------|--------|
| `plan_version` | Plan read access | `PLANS:UPDATE` and plan not locked | Same as edit | Same as edit |
| `standalone` | `DOCUMENTS:READ`, `DOCUMENTS:MANAGE`, or creator | Creator, `DOCUMENTS:UPDATE`, or `DOCUMENTS:MANAGE` | `DOCUMENTS:CREATE` or `DOCUMENTS:MANAGE` | Creator, `DOCUMENTS:DELETE`, or `DOCUMENTS:MANAGE` |

## Troubleshooting

### Editor opens but shows "Download failed"

ONLYOFFICE runs in Docker and fetches files from `COLLABORATION_PUBLIC_URL` (usually `http://host.docker.internal:4100`). That resolves to a **private IP** (`172.17.0.1`), which Document Server blocks by default.

`docker-compose.yml` already sets `ALLOW_PRIVATE_IP_ADDRESS=true` and `ALLOW_META_IP_ADDRESS=true` for local dev. Recreate the container after changing compose:

```bash
docker compose down
docker compose up -d
```

Confirm in logs (no "private IP address" errors):

```bash
docker exec mom-onlyoffice grep "private IP" /var/log/onlyoffice/documentserver/converter/out.log | tail -3
```

## Production notes

- Put collaboration-service and ONLYOFFICE behind HTTPS reverse proxy
- Use S3/MinIO for `DOCUMENT_STORAGE_PATH` in a later iteration
- Ensure ONLYOFFICE can reach `COLLABORATION_PUBLIC_URL` from inside Docker
