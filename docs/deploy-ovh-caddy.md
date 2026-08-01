# Deploy on OVH Cloud + Caddy (soft launch)

Target for inviting first testers: one VPS on **OVH Cloud**, reverse proxy **Caddy** (auto HTTPS), same shape as a classic Hetzner box — only the provider and proxy stack differ.

This is the runbook sketch for production-like testing. Secrets stay on the server (never commit).

## Hostname (no dedicated PETS domain yet)

| Option | Use? | Notes |
|--------|------|--------|
| **`pb.websmith-shop.com`** | **Preferred** | Subdomain of the main shop site. Caddy gets Let's Encrypt TLS automatically. Good enough for beta invites. |
| Raw OVH public IP | Only as fallback | Works over HTTP; HTTPS for bare IP is awkward (no free LE cert for IP). Auth email links and cookies are uglier. Avoid for testers. |
| Future dedicated domain | Later | Point DNS here and change Caddy + `FRONTEND_URL` / `NUXT_PUBLIC_SITE_URL` in one go. |

**DNS:** create an **A** (and optional **AAAA**) record:

```text
pb.websmith-shop.com  →  <OVH VPS public IPv4>
```

TTL can be short (300s) while testing. No need for a separate `api.` host for soft launch.

## Architecture

```text
Internet
   │
   ▼
Caddy (:443 TLS)  host: pb.websmith-shop.com
   ├── /           → Nuxt (127.0.0.1:3000)
   └── /api/*      → Fastify API (127.0.0.1:8080)
         │
         ├── Postgres (Docker or local, not public)
         └── uploads disk  /var/lib/pets/uploads
```

Same-origin `/api` via Caddy matches Nuxt with empty `apiBase`.

## Soft-launch checklist

1. OVH instance + DNS `pb.websmith-shop.com` → public IP  
2. Firewall: only `22` (or your SSH), `80`, `443` — **no** public Postgres  
3. Docker (Postgres + optionally API) or Node processes under systemd  
4. Caddy site block for `pb.websmith-shop.com` + TLS  
5. `FRONTEND_URL=https://pb.websmith-shop.com` + strong `JWT_SECRET`  
6. Real email (Resend/SMTP) so register/verify works for strangers  
7. Persistent uploads dir + DB backup cron  
8. Smoke: register → verify mail → add pet/post → marketplace inquiry  

Out of scope for first invite: Twilio, consultations, ads, multi-region.

## Suggested server layout (matches existing OVH box)

Same pattern as other `websmith-shop.com` sites:

```text
/home/ubuntu/www/pb.websmith-shop.com/   # monorepo checkout
/home/ubuntu/www/pb.websmith-shop.com/.env.production
/home/ubuntu/www/pb.websmith-shop.com/backend/uploads
/home/ubuntu/caddy/Caddyfile             # mounted into caddy container
Docker network: web-network              # shared with caddy, n8n, mainsite-api
Containers: pets-postgres, pets-api, pets-web
```

Compose file: `docker-compose.ovh.yml` (joins external `web-network`).

## Example Caddyfile

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
| `NUXT_PUBLIC_SITE_URL` | `https://pb.websmith-shop.com` |
| `JWT_SECRET` | Long random; not the docker default |
| `DATABASE_URL` | Strong password; host not exposed publicly |
| `UPLOADS_DIR` | Persistent path; backup with DB |
| `RESEND_API_KEY` / `EMAIL_FROM` or `SMTP_*` | Must deliver to arbitrary tester emails |
| `NUXT_API_INTERNAL` | `http://127.0.0.1:8080` |

Dev-only login (`master@pets.local`) must **not** be relied on in public beta; disable or change password after migrate if that migration ran.

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
4. Soft-launch UX: hide or stub Learn, beta banner, feedback email.  
5. Later: move to a dedicated PETS domain without changing app architecture — only DNS + env + Caddy host.
