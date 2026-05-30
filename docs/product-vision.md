# PETS — product vision (notes)

Living document for decisions we should not forget while building v1.

## Auth & users (v1)

- **No registration roles** (no cat/dog lover, shop, clinic as user types).
- **One user model:** `users` + `user_auth` (+ `user_mfa` later).
- **Guest:** browse (feed, animals, comments, public learn/consultations catalog).
- **Logged in:** like, comment, post, marketplace, ads, profile edit.
- **Login:** email + password; nickname display-only; email change with verification later.

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

## Not roles — separate products later

| Participant | Purpose | UI |
|-------------|---------|-----|
| Regular user | Social + marketplace + consultations discovery | Main site (`AppShell`) |
| **Consultant** (vet behavior, training, etc.) | Feedback, bookings, light workload | **Lite cabinet** later (`/consult` or subdomain) — inbox, schedule, profile, settings only |
| **Advertiser** | Pay for ads; minimal site usage | Separate billing/cabinet later |
| **Certified clinic / instructor** | Verified health/education content | Verification badge + publish rights, not a “site role” |

Implement as **separate tables/flags** (e.g. `consultant_profiles`, `verified_providers`), not a `role` enum on `users`.

## Main site: “Our consultations” (public)

- Route idea: `/consultations` (nav TBD: 4th tab or under Learn).
- **Catalog:** sections/categories + search.
- User picks a consultant → public profile `/consultations/:id`.
- Actions (message, book) require login.
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

## Deferred

- Marketplace inquiry **SMS via Twilio** (production); until then console/backup email only.
- Color palette / login icon recolor (SVG or themed asset).
- Supabase / VPS deploy when multi-user testing needed.
- n8n on VPS; workflow exports in `agents/n8n/`.
- Feed: repost, share, report, notifications, rich link previews.
