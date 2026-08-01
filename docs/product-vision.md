# PETS — product vision (notes)

Living document for decisions we should not forget while building v1.

## Audience (now vs later)

**Today (MVP):** the product behaves as a club for **animal lovers / pet owners** — gallery, feed, marketplace, inquiries.

**Later (same platform, wider club):** the audience expands without splitting into separate “sites”:

| Audience | Intent |
|----------|--------|
| Pet lovers / owners | Social + pets + classifieds (current core) |
| Breeders | Lines, litters, matching, specialized listings — expands app surface |
| Businesses | Clinics, pet shops, kennels, groomers, hotels, schools, … |
| Consultants / specialists | Advise owners and breeders (often clinic-linked) |
| Knowledge publishers | Blogs/articles: care, treatment, prophylaxis, training, breeding practice |
| Advertisers & sponsors | Paid placements; optional “fee as investment/sponsorship” model |
| Club members as advertisers | Members can also buy/earn promo for their own offers |

**Principle:** each participant **adds capabilities** to the account (profiles, publish rights, billing), rather than choosing one exclusive role at signup. Full write-up: [audience-and-capabilities.md](./audience-and-capabilities.md).

## Auth & users (v1)

- **No registration roles** (no cat/dog lover, shop, clinic as user types).
- **One user model:** `users` + `user_auth` (+ `user_mfa` later).
- **Guest:** browse (feed, animals, comments, public learn/consultations catalog).
- **Logged in:** like, comment, post, marketplace, ads, profile edit.
- **Login:** email + password; nickname display-only; email change with verification later.
- **Later:** attach breeder / business / consultant / publisher / advertiser capabilities to the same user (see audience doc).

## Community feed (`/feed`)

Inspired by Facebook’s composer, but **one post type only** for v1.

### Simple post (v1)

- Any logged-in user can publish **text**, **photos**, **videos**, or **any mix** in a single post.
- Free-form content: updates, thoughts, pet photos, informal announcements, etc.
- **Not** the place for paid ads or structured classifieds — those get **separate sections and tools** later (marketplace, advertiser cabinet).

### Engagement (feed)

| Feature | Guests | Logged in |
|---------|--------|-----------|
| Read feed | Yes | Yes |
| Create post | No | Yes |
| Like | No | Yes |
| Comment | No | Yes |
| Save to cabinet | No | Yes (bookmarks; UI under `/app` later) |

Deferred for feed (separate Facebook-style types): **Stories**, **Live video**, **Feeling/Activity**, check-in, GIF picker, tag-people bar.

### Implementation order

1. Posts + media upload + feed list/composer  
2. Likes  
3. Comments  
4. Saves (personal cabinet list) — **done** (`/app/saved`)
5. My posts in cabinet (`/app/my-posts`): list, edit text, delete post, moderate comments (delete)

**Deferred:** list of gallery pets you liked (`pet_likes`) in profile — decide later if needed.

API prefix: `/api/feed/…`. Media files under `uploads/posts/`.

## Not roles — capabilities and surfaces later

| Capability | Purpose | UI direction |
|------------|---------|--------------|
| Regular member (lover/owner) | Social + marketplace + discovery | Main site (`AppShell`) |
| **Breeder** | Breeding program presence, litters, matching | Profile + tools on main site / cabinet later |
| **Business** (clinic, shop, kennel, …) | Org presence, services, trust | Business profile + service tools later |
| **Consultant** (vet, behavior, training, …) | Advise owners/breeders; bookings / Q&A | **Lite cabinet** later (`/consult` or subdomain) — inbox, schedule, profile, settings |
| **Knowledge publisher** | Articles/blogs on care, treatment, prophylaxis, expertise | Learn / articles with verification badge + publish rights |
| **Advertiser / sponsor** | Paid or sponsorship placements (external or member) | Billing / campaign cabinet later; members may use the same tools |

Implement as **separate tables/flags** (e.g. `breeder_profiles`, `business_profiles`, `consultant_profiles`, `verified_publishers`, ad entitlements), **not** a `role` enum on `users`. See [audience-and-capabilities.md](./audience-and-capabilities.md).

## Knowledge & consultations (public, later)

### Learn / articles

- Clinics, specialists, and other verified contributors publish educational content (care, treatment, disease prevention, training, breeding practice).
- Distinct from casual feed posts; verification and moderation matter.
- Route may live under `/learn` (today a stub) or a dedicated articles section.

### Consultations catalog

- Route idea: `/consultations` (nav TBD: under Learn or own tab).
- **Catalog:** sections/categories + search.
- User picks a consultant → public profile `/consultations/:id`.
- Actions (message, book) require login.
- Audience: owners **and** breeders seeking professional advice.
- Consultants manage replies in **lite cabinet**, not in full feed UI.

## UI structure (current)

- Mobile-first `AppShell`: header, 3 public nav items (Animals, Feed, Learn), sidebars on `lg+`.
- Guest: login door icon in header → `/auth` (login / sign up / password tabs).
- Logged in: avatar in header → menu later (profile, settings, logout); **no Profile in bottom nav**.

## Marketplace (`/marketplace`, `/app/my-listings`)

- Classifieds: listings, optional photos (max 5), draft/publish.
- **Inquiry messages:** one chat per listing + buyer; inbox at `/app/marketplace-inquiries` (role filters, not sent/received folders).
- **Seller alerts:** email (Resend/SMTP) works in dev/prod; per-listing toggles in edit form.
- **SMS alerts:** UI + backend ready; **Twilio not configured yet** — messages log to API console until `TWILIO_*` in `backend/.env`. See [marketplace-notifications.md](./marketplace-notifications.md).
- **Later:** global notification defaults in user Preferences (today: per listing only).

## Current cycle decision (May 2026)

- Stabilization pass added inquiry unread badge + polling + read-state fixes.
- Backend now emits structured product events in logs (`listing_*`, `inquiry_*`).
- **Next product focus:** marketplace ranking + practical filters (category, price ranges, promoted/benefit ordering).

## Deferred

- Marketplace inquiry **SMS via Twilio** (production); until then console/backup email only.
- Breeder / business / consultant / publisher **capability profiles** (see audience doc).
- Learn articles + verified professional publishing.
- Consultations catalog + consultant lite cabinet.
- Ads, member boosts, sponsorship / “fee as investment” billing models.
- Color palette / login icon recolor (SVG or themed asset).
- Supabase / **OVH Cloud VPS** deploy when inviting testers (Caddy TLS). See [deploy-ovh-caddy.md](./deploy-ovh-caddy.md).
- n8n on VPS; workflow exports in `agents/n8n/`.
- Feed: repost, share, report, notifications, rich link previews.
