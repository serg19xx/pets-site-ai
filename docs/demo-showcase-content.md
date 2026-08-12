# Demo showcase content (soft launch)

Migration: `backend/migrations/049_demo_showcase_content.sql`

Makes the public site look like a real soft launch before partner emails.

## What it does

1. Deletes `Seed Pet %` (and pedigree/friendship links to them)
2. Deletes empty feed posts
3. Upserts **5 demo owners** (`*@petsbook.local`) with password `SeedPets1!`
4. Adds **1–3 pets each** (greetings EN/FR, no cover → species SVG)
5. Adds **8 text feed posts**
6. Adds **10 active marketplace listings** (sell / buy / service / exchange, Montréal area)

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

After deploy / pull:

```bash
cd backend && npx tsx src/db/migrate-cli.ts
```

Then hard-refresh https://pb.websmith-shop.com/ (Animals, Feed, Marketplace).

## Manual cleanup (if still ugly)

Personal test junk (keyboard mash titles, screenshot covers on real pets) is **not** auto-deleted. Remove those in the app or SQL if they still show above the new demo content.
