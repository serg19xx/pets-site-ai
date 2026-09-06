# Learn legal link monitor (n8n)

Keep the Canada animal-law reference shelf fresh without auto-publishing legal text.

**Status (soft-launch):** design only — **do not build / schedule this workflow yet**. The curated shelf + on-page filter are enough for now. Revisit when the catalog is larger or dead links become a real problem.

**Related later feature:** free-text legal search that tries the local catalog first, then assisted lookup via automation — see `docs/learn-and-consultations.md` Stage 1b. That search is also **not** in scope until product asks for it.

**Runtime (when built):** VPS n8n (same pattern as `pet-ai-draft`).  
**Data source today:** [`web/data/learn-legal-links.ts`](../../../web/data/learn-legal-links.ts)  
**Reader UI:** `/learn/legal`

## Principles

1. Automation **detects** dead links, redirects, and content fingerprints.
2. Automation **never** silently edits the site catalog or invents new statutes.
3. An editor **approves** updates (change URL, note, or remove the row) and bumps `checkedAt`.

## Triggers

| Trigger | Purpose |
|---------|---------|
| Cron (weekly suggested) | Quiet health check of all known URLs |
| Manual webhook | “Check now” after news of a law change |

## Suggested flow

1. **Webhook / Schedule** → load JSON list of `{ id, url, checkedAt }` (export from the data file, or later `GET` from an admin API).
2. **HTTP Request** per URL (HEAD or GET): status, final URL after redirects.
3. Optional: hash of response body / title / `ETag` / `Last-Modified`.
4. **Code** node: classify `ok` | `moved` | `dead` | `changed` | `needs_review`.
5. **Email** (or Slack) to editorial inbox with a short report. Optional: append a dated file under `agents/n8n/reports/` (export manually into Git if useful).

## Env / credentials (names only)

| Name | Where |
|------|--------|
| Editorial inbox email | n8n credential / env |
| Webhook path | e.g. `/webhook/petsbook/learn-legal-monitor` |
| Optional shared secret | header checked by n8n |

Do **not** commit real secrets here.

## Out of scope (v1)

- Autonomous web search that adds new laws to the catalog.
- Rewriting statute text inside Pet Friends.
- Municipal by-law crawlers for every city (add Montreal/Laval links by hand first).

## Later

- Admin “Check now” button → API → this webhook.
- Table `learn_legal_links` with `last_checked_at` / `status` after human approve.
- Candidate queue from a curated search prompt (review only).

## Import checklist (when workflow exists)

1. Build and test on https://n8n.websmith-shop.com  
2. Export JSON → `agents/n8n/workflows/learn-legal-monitor.json`  
3. Document the public webhook path in this file (no secrets)
