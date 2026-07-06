# NovaCure Platform

Enterprise healthcare ecosystem platform powering hospitals, clinics, laboratories, pharmacies, and intelligent patient care systems.

## Overview

NovaCure Platform is a modern, AI-powered healthcare enterprise stack for scalable clinical and operational workflows. It includes:

- **Frontend** — Next.js admin and public web application
- **Backend** — Express.js REST API with PostgreSQL

## Getting started

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

API: `http://localhost:4000`  
Swagger: `http://localhost:4000/api-docs`

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:3000`

### Docker (optional)

**Direct ports** (API `:4000`, web `:3000`):

```bash
docker compose up -d postgres   # database only
docker compose up -d            # postgres + api + web + nginx
```

**Behind Nginx on port 80** (single public URL, recommended for demos):

```bash
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d --build
```

Open `http://localhost` (not `:3000` / `:4000`). Copy `frontend/.env.example` and `backend/.env.example` and use the commented Nginx/HTTPS values when deploying.

### Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | API + database connectivity (`200` ok, `503` if DB down) |

Docker services `api`, `web`, and `nginx` include healthchecks; `nginx` waits until `api` and `web` are healthy.

### Medical diagram images

After migrations/seeds:

```bash
cd backend
npm run seed:diagram-images
```

Re-run with `--force` to refresh files. Uses cached Wikimedia URLs in `config/medicalDiagramResolvedUrls.json`.

### Demo credentials

| Account | Password |
|---------|----------|
| `admin@gmail.com` | `password` |
| `ophthalmologist@ophthalmology.demo` | `password` |
| Other `*@ophthalmology.demo` staff | `password` |

See [docs/CLINICAL_DEMO.md](./docs/CLINICAL_DEMO.md) for the full ophthalmology walkthrough (reception → diagnosis → lab → prescribe).

See [CLEANUP_REPORT.md](./CLEANUP_REPORT.md) for stabilization details, removed dependencies, and known follow-ups.

## Environment

| Variable | Description |
|----------|-------------|
| `APP_NAME` | Platform name used in emails and notifications (default: NovaCure Platform) |
| `NEXT_PUBLIC_APP_NAME` | Public app name for the frontend |

## License

Proprietary — NovaCure Platform.
