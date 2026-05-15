# PETS — product vision (notes)

Living document for decisions we should not forget while building v1.

## Auth & users (v1)

- **No registration roles** (no cat/dog lover, shop, clinic as user types).
- **One user model:** `users` + `user_auth` (+ `user_mfa` later).
- **Guest:** browse (feed, animals, comments, public learn/consultations catalog).
- **Logged in:** like, comment, post, marketplace, ads, profile edit.
- **Login:** email + password; nickname display-only; email change with verification later.

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

## Deferred

- Color palette / login icon recolor (SVG or themed asset).
- Supabase / VPS deploy when multi-user testing needed.
- n8n on VPS; workflow exports in `agents/n8n/`.
