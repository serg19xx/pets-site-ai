# Deploy on OVH Cloud + Caddy (soft launch)

Target for inviting first testers: one VPS on **OVH Cloud**, reverse proxy **Caddy** (auto HTTPS), same shape as a classic Hetzner box — only the provider and proxy stack differ.

This is the runbook sketch for production-like testing. Secrets stay on the server (never commit).

## Hostname (no dedicated PETS domain yet)

| Option | Use? | Notes |
|--------|------|--------|
| **`pb.websmith-shop.com`** | **Preferred** | Subdomain of the main shop site. Caddy gets Let's Encrypt TLS automatically. Good enough for beta invites. |
| Raw OVH public IP | Only as fallback | Works over HTTP; HTTPS for bare IP is awkward (no free LE cert for IP). Auth email links and cookies are uglier. Avoid for testers. |
| Future dedicated domain | Later | Point DNS here and change Caddy + `FRONTEND_URL` / `NUXT_PUBLIC_SITE_URL` in one go. |

**DNS:** create **A** (and optional **AAAA**) records:

```text
pb.websmith-shop.com        →  <OVH VPS public IPv4>
admin.pb.websmith-shop.com  →  <same IPv4>
```

TTL can be short (300s) while testing. No need for a separate `api.` host for soft launch.

## Architecture

```text
Internet
   │
   ├─ pb.websmith-shop.com        → pets-web :3000  (member Nuxt)
   │     └── /api/*               → pets-api :8080
   │
   └─ admin.pb.websmith-shop.com  → pets-admin :3001 (operator Nuxt)
         └── /api/*               → pets-api :8080
                │
                ├── Postgres (Docker, not public)
                └── uploads disk
```

Same-origin `/api` via Caddy matches Nuxt with empty `apiBase`.

## Soft-launch checklist

1. OVH instance + DNS `pb.websmith-shop.com` and `admin.pb.websmith-shop.com` → public IP  
2. Firewall: only `22` (or your SSH), `80`, `443` — **no** public Postgres  
3. Docker (Postgres + optionally API) or Node processes under systemd  
4. Caddy site blocks for `pb…` and `admin.pb…` + TLS  
5. `FRONTEND_URL=https://pb.websmith-shop.com`, `ADMIN_URL=https://admin.pb.websmith-shop.com`, strong `JWT_SECRET`  
6. `ADMIN_EMAILS=tagsmith.web@gmail.com` (must be a registered account; use only on admin site)  
7. Real email (Resend/SMTP) so register/verify works for strangers  
8. Persistent uploads dir + DB backup cron  
9. Smoke: register → verify mail → add pet/post → marketplace inquiry; admin login → feedback inbox  

Out of scope for first invite: Twilio, consultations, ads, multi-region.

## Suggested server layout (matches existing OVH box)

Same pattern as other `websmith-shop.com` sites:

```text
/home/ubuntu/www/pb.websmith-shop.com/   # monorepo checkout
/home/ubuntu/www/pb.websmith-shop.com/.env.production
/home/ubuntu/www/pb.websmith-shop.com/backend/uploads
/home/ubuntu/caddy/Caddyfile             # mounted into caddy container
Docker network: web-network              # shared with caddy, n8n, mainsite-api
Containers: pets-postgres, pets-api, pets-web, pets-admin
```

Compose file: `docker-compose.ovh.yml` (joins external `web-network`).

## Local vs production data (important)

**Local Postgres and OVH Postgres are separate.** They never sync automatically.

| What deploys after local work | What does **not** deploy |
|-------------------------------|---------------------------|
| Code (`web/`, `admin/`, `backend/`) | Rows in `users`, pets, posts, feedback, … |
| Schema migrations (`backend/migrations/*.sql`) | Local seed / demo data |
| Env changes only when you edit server `.env.production` | `pg_dump` / DBeaver copy from laptop → server |

On API start, only **pending migration files** run (structure / controlled SQL). They must be **idempotent** and must **not** wipe or overwrite production rows unless you explicitly write a one-off migration and ask for that deploy.

**Copying data** local → OVH (or the reverse) happens **only on explicit request** — never as part of a normal rsync/rebuild.

DBeaver on OVH is for inspecting/editing **server** data. Local Docker DB stays for development only.

## Example Caddyfile

Prefer Docker DNS names when Caddy shares `web-network` with the pets stack:

```caddy
pb.websmith-shop.com {
        encode gzip

        handle /api/* {
                reverse_proxy pets-api:8080
        }

        handle {
                reverse_proxy pets-web:3000
        }
}

admin.pb.websmith-shop.com {
        encode gzip

        handle /api/* {
                reverse_proxy pets-api:8080
        }

        handle {
                reverse_proxy pets-admin:3001
        }
}
```

If Caddy proxies via published host ports instead:

```caddy
pb.websmith-shop.com {
        encode gzip

        handle /api/* {
                reverse_proxy 127.0.0.1:8080
        }

        handle {
                reverse_proxy 127.0.0.1:3000
        }
}

admin.pb.websmith-shop.com {
        encode gzip

        handle /api/* {
                reverse_proxy 127.0.0.1:8080
        }

        handle {
                reverse_proxy 127.0.0.1:3001
        }
}
```

Caddy obtains certificates automatically (HTTP-01) once DNS points at the VPS. Open ports 80/443.

If Nuxt is built as a Node server (`nuxt build` → `node .output/server/index.mjs`), keep it on `3000`.  
If you later serve only static + Nitro differently, adjust the `handle` block only.

### Optional: temporary IP-only (HTTP)

Only if DNS is not ready yet:

```caddy
:80 {
        handle /api/* {
                reverse_proxy 127.0.0.1:8080
        }
        handle {
                reverse_proxy 127.0.0.1:3000
        }
}
```

Then set `FRONTEND_URL=http://x.x.x.x` (no HTTPS). Switch to `pb.websmith-shop.com` as soon as the A record exists.

## Processes (minimal)

**Postgres** — Docker Compose `postgres` service only (do not publish `5432` to `0.0.0.0` in production; use internal network or `127.0.0.1:5432:5432`).

**API**

```bash
cd /opt/pets/backend
# UPLOADS_DIR=/var/lib/pets/uploads
# PORT=8080
# DATABASE_URL=postgresql://…@127.0.0.1:5432/pets
# FRONTEND_URL=https://pb.websmith-shop.com
npm ci
npm run db:migrate
npm run build
# run via systemd or: node dist/index.js
```

**Web**

```bash
cd /opt/pets/web
# NUXT_PUBLIC_SITE_URL=https://pb.websmith-shop.com
# NUXT_API_INTERNAL=http://127.0.0.1:8080
npm ci
npm run build
# run via systemd: node .output/server/index.mjs  (PORT=3000)
```

Use **systemd** (or Docker) so reboot restores the stack. Example unit names: `pets-api.service`, `pets-web.service`.

## Env that must be production-correct

| Variable | Soft-launch value |
|----------|-------------------|
| `FRONTEND_URL` | `https://pb.websmith-shop.com` |
| `ADMIN_URL` | `https://admin.pb.websmith-shop.com` |
| `NUXT_PUBLIC_SITE_URL` | `https://pb.websmith-shop.com` |
| `NUXT_PUBLIC_ADMIN_URL` | `https://admin.pb.websmith-shop.com` |
| `JWT_SECRET` | Long random; not the docker default |
| `ADMIN_EMAILS` | e.g. `tagsmith.web@gmail.com` — must match a registered account |
| `DATABASE_URL` | Strong password; host not exposed publicly |
| `UPLOADS_DIR` | Persistent path; backup with DB |
| `RESEND_API_KEY` / `EMAIL_FROM` or `SMTP_*` | Must deliver to arbitrary tester emails |
| `NUXT_API_INTERNAL` | `http://127.0.0.1:8080` |

## Email on OVH

Resend (or SMTP) must allow sending. You can verify **`websmith-shop.com`** (or a subdomain) in Resend even while the app lives on `pb.websmith-shop.com`. Until a sending domain is verified, signup mail often only reaches the Resend account owner — **blocker for inviting strangers**.

`EMAIL_FROM` example once DNS for mail is ready: `PETS Beta <noreply@websmith-shop.com>` (or a dedicated subdomain you verify).

## Backups

- Daily: `pg_dump` + tar of `/var/lib/pets/uploads`
- Keep off-box copy (OVH Object Storage / another region / local)
- Restoring only Postgres without uploads breaks images

## Relation to local alternate ports

On a laptop, API may run on `:8081` if `:8080` is taken (other projects). On OVH, keep the simple default: **API `8080`, web `3000`, only Caddy public**.

## Provider note

Migrated from **Hetzner** to **OVH Cloud**. Ops model is the same (single VPS + reverse proxy + Docker Postgres). Proxy choice here: **Caddy** instead of nginx/traefik.

## Next implementation steps (when ready)

1. Point DNS `pb.websmith-shop.com` → OVH IP; deploy Caddy block above.  
2. Add systemd unit examples under `deploy/` (optional).  
3. Add production `docker-compose.prod.yml` if you prefer all-in-Docker behind Caddy.  
4. Soft-launch UX: hide or stub Learn, beta banner; in-app feedback at `/app/feedback`.  
5. Later: move to a dedicated PETS domain without changing app architecture — only DNS + env + Caddy host.
