# Learn and Consultations

Living plan for the knowledge library (`/learn`) and the specialist catalog (`/consultations`).  
Ship in small steps. Do not build a CMS, author Word processor, or booking calendar until there is real material and real people.

Related: [audience-and-capabilities.md](./audience-and-capabilities.md), [partners-soft-launch.md](./partners-soft-launch.md), [next-product-bets.md](./next-product-bets.md).  
Contributor tracker: [learn-contributors-tracker.md](./learn-contributors-tracker.md).

## Decisions that do not change

- **Learn** = durable guides (read). **Consultations** = people you can ask later. Not one pile.
- Primary browse axis = **animal species**. Topics (care, health, behavior, city) sit *inside* a species. Do not show empty species.
- An author writes **one original language**. Site chrome stays EN/FR. Article translation is not editorial work.
- A contributor **does not need a site account**. Same idea as local partners. Attach a user later if they want to edit or answer requests.
- External intake: **PDF / Word / images** to the editorial inbox. Readers see HTML on a phone.
- In-site editor later: **TipTap**, narrow toolbar (headings, bold/italic, lists, images). No font picker, no drawing, no charts.
- Courses / “training product” are out of this plan.
- Consultations do not start until **2–3 real specialists** exist.

## Three layers

| Layer | What | Surface |
|-------|------|---------|
| People | Who may write or consult | Contributor record (tracker, later a table) |
| Materials | Guides | `/learn`, `/learn/:slug` |
| Consultations | Live ask / request | `/consultations` (later) |

One contributor → many guides + zero or one consultation card.

### Contributor statuses

- `guest` — one-off piece; we publish for them
- `regular` — a series; may appear in the consultation catalog later
- `partner` — clinic/shop content as trust, not a personal blog

## Species and topics

**Species (nav):** `dog` · `cat` · `small` (rabbit, guinea pig, … — one basket until there is an expert) · `general` (city, season, product how-tos).

**Topics:** care · health (disclaimer: not a vet visit) · nutrition · behavior · city (QC winter, walks, neighbours).

No author for a species → no section. Better eight dog cards than twelve empty “reptiles” shelves.

## Language

- Store `originalLang` on each guide. Show “Original: …” and set `lang` on the article body so the **browser** can translate.
- Switching the site EN/FR must **not** hide the guide or pretend we wrote a second language.
- Later (only if browser translate is not enough): a button for machine EN↔FR (DeepL preferred), **cached**, labelled as auto-translate. Original stays canonical.
- Do not download translations in the first waves. Do not use a site-wide Google Translate widget.

## Editor (when we need it)

TipTap (MIT) in an **editorial** screen, not in a public author cabinet. Images go through existing uploads. Complex clinic layout stays a PDF attachment; the phone-readable guide is short HTML.

## Implementation stages

### Stage 0 — stop lying on the pages (this pass)

1. This document + contributor tracker.
2. `/learn` is a library only; consultations are a link, not a second empty panel.
3. Species shelves; hide species with zero guides.
4. `/consultations` is its own honest stub.
5. Tracker of people (doc table), not a database yet.

### Stage 1 — wave-0 guides

A handful of short editorial guides (same spirit as FAQ) so the Learn tab is not a dead end. Example mix: one dog, one cat, one general (winter / city QC). Original language can be English; UI stays bilingual.

**Done when:** phone user can open Learn → species → a guide.

### Stage 1b — legal link shelf (Canada)

Static curated links in `web/data/learn-legal-links.ts`, UI at `/learn/legal` (card from `/learn`). Federal + provinces/territories; Quebec listed first. Disclaimer: not legal advice; municipal by-laws are separate.

**Search (now):** a filter field on `/learn/legal` matches the curated list only (titles, notes, region, topics).

**Search (later — do not build yet):** free-text box where the user describes what they need. Flow:

1. **Local first** — AI / retrieval over the curated catalog (+ later Learn guides) and return matching official links / notes.
2. **If nothing useful locally** — hand off to automation (n8n or similar) to look up candidates from trusted government sources.
3. **Human approve** before anything new is added to the shelf; never auto-publish statute text as legal advice.

Freshness monitor (n8n URL health): documented in `agents/n8n/docs/learn-legal-monitor.md` — **deferred** for now; not required at soft-launch.

**Done when:** member can open Learn → Animal law references → official sources (+ filter the list).

### Stage 2 — publish without a frontend deploy

Tables `contributors` (optional `user_id`) and `learn_guides`; TipTap + image upload for **us**. External authors still send files. Guests read published HTML.

### Stage 3 — in-place auto-translate

EN↔FR button, cache, medical disclaimer. No download yet.

### Stage 4 — Consultations

Same contributor, flag “consults” + species they take. Catalog + login request (marketplace-inquiry style) or email. Consultant cabinet only if they ask to run a queue.

### Stage 5 — not until it hurts

Author-facing editor, font pickers, in-browser Word/PDF, courses, comments on guides, empty rare-species sections, requiring a second language from the author.

## Chronology of content (editorial queue)

| Wave | Why | Example |
|------|-----|---------|
| 0 | Page not empty | 1 dog, 1 cat, 1 general |
| 1 | Useful here (QC) | Winter paws, heat, city walks |
| 2 | Life cycle | Puppy/kitten first weeks, when to see a vet |
| 3 | Species with a real expert | Rabbit only with someone who knows rabbits |
| 4 | Consultations | Catalog after 2–3 real people |

Seasonal and dangerous first; library does not expire like a feed. Show “updated”; rewrite, do not duplicate.

## Medical accuracy

Health guides need a visible disclaimer. Original language is the source of truth. Machine translation is assistance, not a second official article. Prefer named vet/clinic authors before deep medical pieces.
