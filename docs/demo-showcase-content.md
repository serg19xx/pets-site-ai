# Demo showcase content (soft launch)

Migration: `backend/migrations/049_demo_showcase_content.sql`

Makes the public site look like a real soft launch before (and while) real testers arrive.

## Policy

- **Keep a few demo rows** on production (and locally for development). An empty gallery looks worse than a small polished cast.
- **2–5 demo owners** is enough; more starts to feel fake.
- Visitors see nicknames / pet names — not `@petsbook.local` — but copy, avatars, and posts must still look human.
- **Local/dev:** keep demo logins for manual testing. **Production visitors** never need those passwords.
- **Remove** keyboard-mash titles, empty posts, broken covers, and leftover `Seed Pet %` noise. Personal throwaway accounts that look broken should be cleaned in the app or SQL (not left above the showcase).

## What migration 049 does

1. Deletes `Seed Pet %` (and pedigree/friendship links to them)
2. Deletes empty feed posts
3. Upserts **5 demo owners** (`*@petsbook.local`) with password `SeedPets1!`
4. Adds **1–3 pets each** (greetings EN/FR, no cover → species SVG)
5. Adds **8 text feed posts**
6. Adds **10 active marketplace listings** (sell / buy / service / exchange, Montréal area)

If the live site still looks sparse or “fake,” prefer **editing/hiding junk** and adding 1–2 real photos later over deleting the whole showcase.

## Demo accounts

| Email | Nickname |
|-------|----------|
| camille.bergeron@petsbook.local | camille_b |
| julien.moreau@petsbook.local | julien_m |
| sophie.chen@petsbook.local | sophie_c |
| nadia.tremblay@petsbook.local | nadia_t |
| omar.hassan@petsbook.local | omar_h |

Password (all): `SeedPets1!`

## Apply on server

After deploy / pull (only if this migration has not already run):

```bash
cd backend && npx tsx src/db/migrate-cli.ts
```

Then hard-refresh https://pb.websmith-shop.com/ (Animals, Feed, Marketplace).

## Manual cleanup (if still ugly)

Personal test junk (keyboard mash titles, screenshot covers on real pets) is **not** auto-deleted. Remove those in the app or SQL if they still show above the new demo content.

Recruitment context: [beta-recruitment-plan.md](./beta-recruitment-plan.md).
