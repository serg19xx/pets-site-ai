# PETS monorepo

Single workspace for the **Vue frontend**, **Node/Fastify API**, **n8n-related assets** (exports and docs; runtime on VPS), and **Docker Compose** (PostgreSQL + API).

## Layout

| Path | Role |
|------|------|
| `frontend/` | Vue 3 + Vite + TypeScript SPA |
| `backend/` | Node.js + Fastify REST API, SQL migrations, `Dockerfile` |
| `agents/n8n/` | Versioned workflow exports from your **VPS n8n** and operator docs (no secrets) |
| `docker-compose.yml` | PostgreSQL + `api` (built from `backend/`) |
| `docker/postgres/` | Reserved for optional SQL init scripts |
| `docs/data-source.md` | How to swap Docker Postgres ↔ Supabase via `DATABASE_URL` |
| `docs/postgres-client.md` | DBeaver / GUI clients and `psql` — connect to local Postgres |
| `docs/api.md` | OpenAPI / Swagger UI URLs and notes for integrators |
| `docs/product-vision.md` | Product decisions: no roles, consultations catalog, lite consultant cabinet (later) |

## n8n

Production **n8n runs on your VPS**, not in this Compose file. Use `agents/n8n/` only to store JSON exports and runbooks.

## Prerequisites

- Node.js **20+** (LTS) for frontend and backend
- **Docker Desktop for Mac** (or another setup where `docker` and `docker compose` work). Install from [Docker Desktop](https://www.docker.com/products/docker-desktop/), launch the app once so the daemon starts. If you see **Cannot connect to the Docker daemon**, Docker is not running or not installed.

## One-command scripts (macOS / Linux, bash)

From the **repo root** `PETS/`:

| Command | What it does |
|---------|----------------|
| `./scripts/dev.sh` | Docker Postgres → waits until ready → `npm run dev` in **backend** and **frontend** together (Ctrl+C stops both). Creates `backend/.env` and `frontend/.env` from `*.example` if missing. |
| `./scripts/docker-up.sh` | Only **Postgres** in Docker (when you run API/Vite yourself). |
| `./scripts/docker-up-all.sh` | **Postgres + API** in Docker (`docker compose up -d --build`). |
| `./scripts/docker-down.sh` | `docker compose down` (volumes kept). |

First run without `chmod`: `bash scripts/dev.sh` (same for other scripts). To run as `./scripts/dev.sh`, mark executable once: `chmod +x scripts/*.sh`.

## Local development (API on the host, DB in Docker)

Terminal 1 — database:

```bash
cd /path/to/PETS
# Option A — no root .env: Compose uses defaults (user pets / password pets_dev_change_me / db pets)
docker compose up -d postgres

# Option B — custom env: copy template, edit POSTGRES_PASSWORD, then:
# cp .env.docker.example .env
# docker compose --env-file .env up -d postgres
```

Terminal 2 — API (`DATABASE_URL` must use the **same** Postgres password as Compose: default `pets_dev_change_me`, or your `POSTGRES_PASSWORD` from root `.env` if you use Option B):

```bash
cd backend
cp .env.example .env
# edit DATABASE_URL only if your password or port differs
npm install
npm run dev
```

Terminal 3 — frontend:

```bash
cd frontend
cp .env.example .env
# optional: leave VITE_API_BASE_URL unset to use the Vite /api proxy
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8080` (see `frontend/vite.config.ts`).

**API docs (Swagger UI):** with the backend on port 8080, open [http://localhost:8080/api/docs](http://localhost:8080/api/docs) — see [docs/api.md](docs/api.md).

## Full stack in Docker only

```bash
cd /path/to/PETS
docker compose up -d --build
```

With a root `.env` (after `cp .env.docker.example .env` and edits): `docker compose --env-file .env up -d --build`. If you pass `--env-file .env` but the file does not exist, Compose reports **couldn't find env file** — create `.env` or omit `--env-file`.

- API: `http://localhost:${API_PORT:-8080}` (e.g. health: `/api/health`)
- Postgres: `localhost:${POSTGRES_PORT:-5432}`

### Connect from a desktop client (DBeaver, etc.)

With Postgres running (`docker compose up -d postgres` or full stack), use a **PostgreSQL** connection to the host:

| Field | Default (no root `.env`) |
|-------|---------------------------|
| Host | `127.0.0.1` |
| Port | `5432` (or your `POSTGRES_PORT`) |
| Database | `pets` |
| User | `pets` |
| Password | `pets_dev_change_me` |

If you use a root `.env`, take **`POSTGRES_*`** from there and match **`backend/.env` → `DATABASE_URL`**. For DBeaver, disable **SSL** for local Docker. Step-by-step and troubleshooting: **[docs/postgres-client.md](docs/postgres-client.md)**.

Stop:

```bash
docker compose down
```

## Git

```bash
git init
git add .
git commit -m "chore: initial monorepo with API and Docker"
```

Create a repository on GitHub, then (replace URL with yours):

```bash
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

If the repo was already initialized earlier, skip `git init` and start from `git remote add` after the first commit.
