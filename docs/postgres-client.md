# Connect to local Postgres (DBeaver, TablePlus, etc.)

Use this when PostgreSQL runs from the repo root **`docker compose`** and the default port is published to your machine (`POSTGRES_PORT`, default **5432**).

## Connection parameters (defaults)

These match **`docker-compose.yml`** when you do **not** use a root `.env` file (Compose defaults). If you set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, or `POSTGRES_PORT` in a root `.env`, use **those** values instead.

| Setting | Value |
|---------|--------|
| Host | `127.0.0.1` or `localhost` |
| Port | `5432` (or `POSTGRES_PORT` if you changed it) |
| Database | `pets` |
| User | `pets` |
| Password | `pets_dev_change_me` |

## DBeaver

1. **Database → New Database Connection → PostgreSQL.**
2. **Main** tab: fill Host, Port, Database, Username, Password as in the table above.
3. **SSL** tab: for local Docker, set SSL mode to **disable** (or *prefer* if the driver insists).
4. **Test Connection** → Finish.

Driver: use the built-in PostgreSQL JDBC driver; no extra host beyond your Mac.

## Other clients

- **TablePlus**, **DataGrip**, **pgAdmin**: same host/port/database/user/password.
- **CLI** from the repo root (same credentials as inside the container):

```bash
docker compose exec -it postgres psql -U pets -d pets
```

## If connection fails

- Confirm Postgres is up: `docker compose ps` (or `docker compose up -d postgres`).
- Confirm the mapped port: `docker compose port postgres 5432`.
- Match the password to **`POSTGRES_PASSWORD`** in your root `.env` when you use one, and to **`DATABASE_URL`** in `backend/.env` for the API.

## Security note

These settings are for **local development** only. On a VPS, do not expose Postgres to the public internet without TLS, firewall rules, and strong passwords.
