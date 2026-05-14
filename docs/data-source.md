# Data source portability (Docker Postgres ↔ Supabase)

## Current setup

- **PostgreSQL in Docker** (`docker-compose.yml`) is a **local dev** database. The server listens on the host port you map (default `5432`).
- The SPA does **not** connect to Postgres directly; only the **backend** (or serverless functions) should use a DB connection string.
- To inspect or edit data from your machine with **DBeaver** (or similar), use the host connection settings described in **[postgres-client.md](postgres-client.md)**.

## Rule: one configuration surface

Configure the backend with a **single PostgreSQL URI**, not hard-coded hostnames:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Full URI for your SQL driver (`postgresql://...`). This is the only value you should swap when changing providers. |

Optional split vars (`PGHOST`, `PGUSER`, …) are fine if your framework generates them from `DATABASE_URL`, but avoid scattering `"localhost"` / `"postgres"` service names across the codebase—read them from env.

## Docker Postgres (from the host machine)

When the API runs **on your Mac** and Postgres runs in Docker with port `5432` published:

```bash
DATABASE_URL=postgresql://pets:YOUR_PASSWORD@127.0.0.1:5432/pets
```

When the API runs **inside the same Compose stack** as Postgres, use the service name:

```bash
DATABASE_URL=postgresql://pets:YOUR_PASSWORD@postgres:5432/pets
```

## Moving to Supabase later

Supabase exposes **managed PostgreSQL**. For a normal SQL client or ORM, switching is mostly:

1. Create a project in Supabase.
2. Copy **Database → Connection string** (URI). Prefer the **pooler** URI for many short-lived connections (typical for serverless); use the **direct** session URI for long-lived workers or migrations if the pooler causes issues.
3. Set `DATABASE_URL` to that URI in your deployment / `.env` (never commit secrets).
4. Run **migrations** against the new database (empty project first, or restore from a dump of Docker Postgres if you need data).

You do **not** have to adopt Supabase Auth, Realtime, or Storage to use Supabase as Postgres. If you later add those products, keep them behind separate env vars (`SUPABASE_URL`, service role keys, etc.) so the core `DATABASE_URL` path stays clear.

## Migrations and data

- Track schema with a migration tool (SQL files, Prisma, Drizzle, Flyway, etc.) and run the same migrations against **Docker** now and **Supabase** later.
- To **copy data** from Docker to Supabase: `pg_dump` from local → `psql` or Supabase SQL editor / restore flow (depends on size and downtime tolerance).

## Summary

| Concern | Approach |
|---------|----------|
| Switching hosts | Change `DATABASE_URL` only |
| Local dev | Docker Compose Postgres |
| Hosted Postgres | Supabase (or any other Postgres) with the same URI shape |
| Frontend | Stays HTTP-only to your API; no DB URL in the browser |
