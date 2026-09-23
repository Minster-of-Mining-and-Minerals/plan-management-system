# Plan Management System

Government plan management platform with organizational structures, role-based access control, plan lifecycle (draft → execution → achievement), issue tracking, and integrated document collaboration (ONLYOFFICE).

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, React, Redux Toolkit Query |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL (main + collaboration DB) |
| Documents | ONLYOFFICE Document Server (Docker) |
| Deployment | Docker Compose, Nginx |

## Project structure

```
plan-management-system/
├── frontend/              # Next.js app (port 3000 in dev)
├── backend/               # Express API + Socket.IO (port 4000)
├── collaboration-service/ # Document module (mounted in backend at /api/v1)
├── nginx/                 # Reverse-proxy config (Docker / production)
├── docker-compose.yml     # Full stack deployment
└── .env.example           # Environment template for Docker
```

---

## Prerequisites

### Local development

- **Node.js** 20+
- **PostgreSQL** 16+
- **Docker Desktop** (required only for document editing / ONLYOFFICE)
- npm

### Docker deployment

- **Docker** 24+ and **Docker Compose** v2
- 4 GB+ RAM recommended (ONLYOFFICE is memory-heavy)

---

## Local development

Local dev runs each service with `npm run dev`. PostgreSQL runs on your machine (or in Docker). ONLYOFFICE runs in Docker when you need the document editor.

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd plan-management-system

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd collaboration-service && npm install && cd ..
```

### 2. PostgreSQL

Create two databases:

```sql
CREATE DATABASE plan_management;
CREATE DATABASE collaboration_service;
```

Or use `psql` / pgAdmin with your preferred credentials.

### 3. Backend environment

Create `backend/.env`:

```env
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
SOCKET_PORT=5000

DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_NAME=plan_management
DB_HOST=localhost
DB_PORT=5432
DB_DIALECT=postgres

JWT_SECRET=your-jwt-secret-at-least-32-chars
JWT_EXPIRES_IN=7d

APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### 4. Collaboration environment

Create `collaboration-service/.env` (copy from `collaboration-service/.env.example`):

```env
COLLABORATION_DB_NAME=collaboration_service
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

COLLABORATION_PUBLIC_URL=http://host.docker.internal:4000
ONLYOFFICE_URL=http://localhost:8080
ONLYOFFICE_JWT_ENABLED=false
FILE_TOKEN_SECRET=collaboration-file-token-secret
DOCUMENT_STORAGE_PATH=./storage/documents
FRONTEND_URL=http://localhost:3000
```

`COLLABORATION_PUBLIC_URL` must be reachable **from inside the ONLYOFFICE Docker container** so it can download and save files. On Windows/Mac Docker Desktop, `host.docker.internal:4000` points to your host machine.

### 5. Frontend environment

Create `frontend/.env.local` (copy from `frontend/example.env`):

```env
AUTH_SECRET=your-random-secret-at-least-32-characters-long
NEXTAUTH_SECRET=your-random-secret-at-least-32-characters-long

NEXT_PUBLIC_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_FILE_URL=http://localhost:4000
NEXT_PUBLIC_COLLABORATION_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_ONLYOFFICE_URL=http://localhost:8080
```

`AUTH_SECRET` and `NEXTAUTH_SECRET` should match values you use for auth (generate with `openssl rand -base64 32`).

### 6. Database migrations

```bash
# Main application database
cd backend
npm run migrate
npm run seed          # optional: permissions, demo data

# Collaboration database
cd ../collaboration-service
npm run db:create     # skip if database already exists
npm run migrate
```

### 7. Start ONLYOFFICE (for document editing)

Start Docker Desktop, then:

```bash
cd collaboration-service
npm run onlyoffice:up
```

Wait 1–2 minutes, then verify: http://localhost:8080

### 8. Run the application

Open **three terminals**:

```bash
# Terminal 1 — API + collaboration + Socket.IO
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

### Local URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api |
| Swagger | http://localhost:4000/api-docs |
| Documents API | http://localhost:4000/api/v1/documents |
| ONLYOFFICE | http://localhost:8080 |
| Socket.IO | http://localhost:5000 |

---

## Docker deployment

Docker runs the full stack: PostgreSQL, backend, frontend, Nginx, and ONLYOFFICE. Collaboration is **integrated into the backend** at `/api/v1` (no separate collaboration container).

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `DB_PASSWORD`
- `AUTH_SECRET`, `NEXTAUTH_SECRET`, `JWT_SECRET` (use `openssl rand -base64 32`)
- `ONLYOFFICE_JWT_SECRET`, `FILE_TOKEN_SECRET`

### 2. Start (Nginx mode — recommended)

Single entry point on port 80 (mirrors production):

```bash
docker compose up -d --build
```

First startup can take **2–3 minutes** while ONLYOFFICE becomes healthy.

| URL | Service |
|-----|---------|
| http://localhost | Frontend |
| http://localhost/api | Backend API |
| http://localhost/api/v1/documents | Documents (collaboration) |
| http://localhost/onlyoffice | ONLYOFFICE editor |
| http://localhost/api-docs | Swagger |

Migrations run automatically on backend startup (`RUN_DB_MIGRATIONS` and `RUN_COLLABORATION_MIGRATIONS`).

Optional seed data:

```bash
# Set RUN_DB_SEEDERS=true in .env, then:
docker compose up -d --build backend
```

### 3. Direct port mode (optional)

Exposes ports like local `npm run dev` (no Nginx):

```bash
# Uncomment the "direct mode" URL block in .env, then:
docker compose -f docker-compose.yml -f docker-compose.direct.yml up -d --build --scale nginx=0
```

| URL | Service |
|-----|---------|
| http://localhost:3000 | Frontend |
| http://localhost:4000/api | Backend API |
| http://localhost:8080 | ONLYOFFICE |

### 4. Production / HTTPS

1. Set public URLs in `.env` (see production example in `.env.example`).
2. Place TLS certificates in `nginx/ssl/` (see `nginx/ssl/README.md`).
3. Enable `ONLYOFFICE_JWT_ENABLED=true` and use strong secrets.
4. Run:

```bash
docker compose up -d --build
```

### Docker services

| Container | Role |
|-----------|------|
| `db` | PostgreSQL (`plan_management` + `collaboration_service`) |
| `backend` | Express API, Socket.IO, collaboration routes |
| `frontend` | Next.js |
| `nginx` | Reverse proxy |
| `mom-onlyoffice` | ONLYOFFICE Document Server |

### Useful commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f onlyoffice

# Stop everything
docker compose down

# Rebuild after code changes
docker compose up -d --build

# ONLYOFFICE only (local dev without full stack)
cd collaboration-service && npm run onlyoffice:up
```

---

## Environment variables reference

| Variable | Local dev | Docker (Nginx) | Purpose |
|----------|-----------|----------------|---------|
| `JWT_SECRET` | `backend/.env` | `.env` | API authentication |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | `frontend/.env.local` | `.env` | NextAuth sessions |
| `COLLABORATION_PUBLIC_URL` | `host.docker.internal:4000` | `http://backend:4000` | ONLYOFFICE file fetch URL (internal) |
| `ONLYOFFICE_URL` | `http://localhost:8080` | `http://localhost/onlyoffice` | Browser editor URL |
| `NEXT_PUBLIC_ONLYOFFICE_URL` | `http://localhost:8080` | `http://localhost/onlyoffice` | Frontend editor URL |
| `NEXT_PUBLIC_COLLABORATION_API_URL` | `http://localhost:4000/api/v1` | `http://localhost/api/v1` | Frontend documents API |

Full list: `.env.example`

---

## Troubleshooting

### Document editor: connection refused on port 8080

ONLYOFFICE is not running. Start Docker Desktop, then:

```bash
cd collaboration-service
npm run onlyoffice:up
```

Wait 1–2 minutes and refresh the document page.

### Document editor: download failed

ONLYOFFICE cannot reach your API. Check `COLLABORATION_PUBLIC_URL`:

- **Local dev:** `http://host.docker.internal:4000`
- **Docker Compose:** `http://backend:4000`

Ensure the backend is running and reachable from the ONLYOFFICE container.

### Collaboration database missing (existing Postgres volume)

If Postgres was created before collaboration support:

```sql
CREATE DATABASE collaboration_service;
```

Restart the backend container or run:

```bash
cd collaboration-service && npm run migrate
```

### Frontend cannot reach API

Verify `NEXT_PUBLIC_BASE_URL` matches how you access the backend:

- Local: `http://localhost:4000/api`
- Docker Nginx: `http://localhost/api`

### Reset local databases

```bash
cd backend
npm run db:fresh    # drops, creates, migrates, seeds main DB
```

---

## Further reading

- [collaboration-service/README.md](collaboration-service/README.md) — documents API, ONLYOFFICE integration
- [docs/MIGRATION_AUDIT_REPORT.md](docs/MIGRATION_AUDIT_REPORT.md) — database migrations
- [nginx/ssl/README.md](nginx/ssl/README.md) — HTTPS setup
