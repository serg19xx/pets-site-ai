# Backend (REST API)

Node.js **20+**, **TypeScript**, **Fastify**, **PostgreSQL** via `pg` and **`DATABASE_URL`** (see [docs/data-source.md](../docs/data-source.md)).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Watch mode with `tsx` |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled app (runs migrations first) |
| `npm run db:migrate` | Run SQL migrations only |

## Configuration

1. Start Postgres (from repo root): `docker compose --env-file .env up -d postgres`
2. Copy `backend/.env.example` → `backend/.env`. The password in `DATABASE_URL` must match **`POSTGRES_PASSWORD`** in the root `.env` used by Compose (see `.env.docker.example`). If you do not use a root `.env`, Compose falls back to user `pets`, password `pets_dev_change_me`, database `pets`.

## HTTP routes

- `GET /api/health` — process up
- `GET /api/health/db` — `SELECT 1` through the pool

## Migrations

SQL files in `backend/migrations/`, sorted by name. Applied once; names recorded in `schema_migrations`. Add `002_*.sql`, `003_*.sql`, etc.

## Docker

The repo root `docker-compose.yml` builds this folder and runs the `api` service. `DATABASE_URL` is injected for the `postgres` hostname on the Compose network.

The frontend calls the API via HTTP (see `frontend` Vite proxy for `/api` and `VITE_API_BASE_URL` in `frontend/.env.example`).
