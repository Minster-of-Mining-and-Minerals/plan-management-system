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

```bash
docker compose up -d postgres   # database only
docker compose up -d            # postgres + api + web (build required)
```

See [CLEANUP_REPORT.md](./CLEANUP_REPORT.md) for stabilization details, removed dependencies, and known follow-ups.

## Environment

| Variable | Description |
|----------|-------------|
| `APP_NAME` | Platform name used in emails and notifications (default: NovaCure Platform) |
| `NEXT_PUBLIC_APP_NAME` | Public app name for the frontend |

## License

Proprietary — NovaCure Platform.
