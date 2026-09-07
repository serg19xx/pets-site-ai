# Learn and Consultations

Living plan for the knowledge library (`/learn`) and the specialist catalog (`/consultations`).  
Ship in small steps. Do not build a CMS, author Word processor, or booking calendar until there is real material and real people.

Related: [audience-and-capabilities.md](./audience-and-capabilities.md), [partners-soft-launch.md](./partners-soft-launch.md), [next-product-bets.md](./next-product-bets.md).  
Contributor tracker: [learn-contributors-tracker.md](./learn-contributors-tracker.md).

## Decisions that do not change

- **Learn** = knowledge base (read). **Consultations** = people you can ask / book later. Not one pile.
- Primary browse axis = **animal species**. Topics (care, health, behavior, city, breeds) sit *inside* a species. Do not show empty species.
- Learn holds **both** phone-readable guides **and** curated external links. Links may outnumber original articles — same shelf pattern as legal (Stage 1b).
- An author writes **one original language**. Site chrome stays EN/FR. Article translation is not editorial work.
- A contributor **does not need a site account**. Same idea as local partners. Attach a user later if they want to edit or answer requests.
- External intake: **PDF / Word / images** to the editorial inbox. Readers see HTML on a phone.
- In-site editor later: **TipTap**, narrow toolbar (headings, bold/italic, lists, images). No font picker, no drawing, no charts.
- Courses / “training product” are out of this plan.
- Consultations do not start until **2–3 real specialists** exist.
- Platform take (subscription and/or % of booking) is a **later** decision — document options now; do not build billing until real consultants are live.

## Three layers

| Layer | What | Surface |
|-------|------|---------|
| People | Who may write or consult | Contributor record (tracker, later a table) |
| Materials | Guides + curated link shelves | `/learn`, `/learn/:slug`, `/learn/legal`, later `/learn/:species` link packs |
| Consultations | Specialist profile, their pieces, ask / book | `/consultations`, `/consultations/:id` (later) |

One contributor → many Learn materials + zero or one consultation card (profile with articles + “Arrange appointment”).

### Contributor statuses

- `guest` — one-off piece; we publish for them
- `regular` — a series; may appear in the consultation catalog later
- `partner` — clinic/shop content as trust, not a personal blog

## Species and topics

**Species (nav):** `dog` · `cat` · `small` (rabbit, guinea pig, … — one basket until there is an expert) · `general` (city, season, product how-tos).

**Topics (inside a species):** care · health (disclaimer: not a vet visit) · nutrition · behavior · training · breeds (overview / popular breeds — not a full encyclopedia on day one) · city (QC winter, walks, neighbours).

No author / no curated links for a species → no section. Better eight dog cards than twelve empty “reptiles” shelves.

### What belongs on a species shelf

Anything useful to an owner of that species, for example:

- How to care for the animal day to day
- Feeding basics and common mistakes
- Training / behavior starters
- Breed overviews (what exists, temperament notes — with sources)
- When to see a vet (signposting, not diagnosis)

Each item is either:

1. **Original guide** — short HTML we host (`/learn/:slug`), or
2. **Curated link** — title, short note, trusted URL, optional topic tags (same spirit as `learn-legal-links.ts`).

Prefer a mix. Do not wait for perfect long articles when a good external guide already exists — link it, label the source, keep editorial control (no auto-scrape into the shelf).

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

### Stage 1c — species link packs (same pattern as legal)

Reuse the legal shelf idea per species: static curated lists (e.g. `web/data/learn-dog-links.ts`) with title, note, URL, topic tags, optional language. Show under Dog / Cat / … only when the pack is non-empty; mix with original guides on the same Learn home.

**Scope for first packs:** care, nutrition, training/behavior, a few breed overviews — trusted clinics, associations, government/animal-welfare pages. No scraped full text; link out. Human approve every URL.

**Done when:** Learn → Dog (or Cat) shows at least a small link pack and/or wave-0 guides — not an empty heading.

### Stage 2 — publish without a frontend deploy

Tables `contributors` (optional `user_id`) and `learn_guides`; TipTap + image upload for **us**. External authors still send files. Guests read published HTML. Link packs can stay in data files until volume forces a table.

### Stage 3 — in-place auto-translate

EN↔FR button, cache, medical disclaimer. No download yet.

### Stage 4 — Consultations (people)

Same contributor, flag “consults” + species / specialties they take (vet, lawyer, nutritionist, trainer, …).

**Public profile** (`/consultations/:id`), e.g. “Dr. Wagner — veterinarian”:

- Short bio, specialty, species they cover
- Their published materials (Learn guides and/or pieces attached to the profile)
- Primary CTA: **Arrange appointment** (login required) — first version can be a request/inbox like marketplace inquiry or email; real calendar later
- Clear that advice is professional service, not a substitute for emergency care where relevant

**Catalog** (`/consultations`): browse by specialty / species + search. Consultant lite cabinet only if they ask to run a queue.

**Done when:** 2–3 real specialists have cards; a logged-in member can send a booking/ask request.

### Stage 4b — monetization (decide after Stage 4 is live)

Do **not** implement payments until consultants are real and the request flow works. Options to keep in mind (can combine later):

| Model | Who pays | Pros | Cons |
|-------|----------|------|------|
| **Monthly subscription** for the consultant (presence / cabinet / listing) | Consultant | Predictable platform revenue; simple billing | Harder sell before traffic is proven |
| **% of consultation / booking fee** | Split from client payment | Aligns with success; scales if global usage grows | Local volume may be small; needs payment rails + disputes |
| **Hybrid** | Both | Listing fee + small take rate | More product/ops complexity |

Open questions (intentionally undecided): whether the platform takes a cut at all at soft-launch; who sets the appointment price (consultant vs platform); refunds / no-shows. Revisit when at least one paid booking path is requested by a real consultant.

Global note: a small % looks weak in one city; the same model can become material income if the site is used across many countries — design data/billing so a take rate can be added without rewriting the catalog.

### Stage 5 — not until it hurts

Author-facing editor, font pickers, in-browser Word/PDF, courses, comments on guides, empty rare-species sections, requiring a second language from the author, full booking calendar, Stripe (or similar) before there is demand.

## Chronology of content (editorial queue)

| Wave | Why | Example |
|------|-----|---------|
| 0 | Page not empty | 1 dog, 1 cat, 1 general guide |
| 0b | Species shelves feel alive | Curated link packs (care / feed / training) + legal shelf |
| 1 | Useful here (QC) | Winter paws, heat, city walks |
| 2 | Life cycle | Puppy/kitten first weeks, when to see a vet |
| 3 | Species with a real expert | Rabbit only with someone who knows rabbits |
| 4 | Consultations | Catalog after 2–3 real people; then appointment CTA |
| 5 | Money | Subscription and/or % — only after paid demand exists |

Seasonal and dangerous first; library does not expire like a feed. Show “updated”; rewrite, do not duplicate. Prefer linking a strong external source over rewriting it badly.

## Medical accuracy

Health guides need a visible disclaimer. Original language is the source of truth. Machine translation is assistance, not a second official article. Prefer named vet/clinic authors before deep medical pieces. Curated health links: prefer professional bodies and known clinics; never present a link shelf as a diagnosis.
