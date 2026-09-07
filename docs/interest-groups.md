# Interest groups (future)

Living plan for **user interest groups / clubs** on PetFriends.  
**Do not build in the current beta cycle** — wait until there are enough real members to debug join, spam, and moderation with. Related: [product-vision.md](./product-vision.md), [next-product-bets.md](./next-product-bets.md), [audience-and-capabilities.md](./audience-and-capabilities.md).

## What it is

Open **theme clubs** inside the site — not the same as Learn (knowledge) or Consultations (named specialists), and not owner↔owner friendship.

Topics can be **anything** useful to members, for example:

- Species: cats, dogs, rabbits, …
- Practice: training, nutrition, health talk (disclaimer: not a vet visit)
- Audience: breeders, city walks, neighbourhood / city clubs
- Hobby / lifestyle: photo pets, rescue, travel with pets, …

One group = one theme + members + posts/discussion (exact feed shape later). Rules and tone are set by the group admin(s).

## Who can create

Any **logged-in account** may create a group — **pet ownership is not required**.  
Animal lovers without pets, trainers, breeders, clinics (later as partner capability) — same create door.

Creator becomes **admin** of that group: monitors activity, moderates content/members, can edit group settings (name, description, topic tags, visibility — exact knobs later).

## Navigation

### Global (left sidebar / main menu)

- Item **Groups** (alongside Feed, Animals, Marketplace, Learn — exact slot when shipping).
- Landing: **all discoverable groups** + **advanced search** (name, topic/tags, species, city/region if set, open vs request-to-join, activity).
- Guest may browse public group cards later if we allow public visibility; create / join / My Groups require login.

### Account / local cabinet menu

- **My Groups** — groups **I created** (and later: groups where I am admin/moderator).
- From here the creator **monitors and moderates** as admin.
- Separate from “groups I only joined as a member” (that list can live under Groups → Joined, or a second tab on My Groups — decide at build time; do not mix “I own” with “I follow” without clear labels).

## Roles (minimum)

| Role | Who | Can |
|------|-----|-----|
| **Admin** | Creator (default); maybe invite co-admins later | Edit group, moderate posts/members, transfer/close |
| **Member** | Joined users | Read / post per group rules |
| **Visitor** | Not joined | See public card / request to join if allowed |

Do not invent a full RBAC matrix before the first ship. One admin + members is enough for v1.

## Surfaces (sketch)

| Route (idea) | Purpose |
|--------------|---------|
| `/groups` | Catalog + advanced search |
| `/groups/:id` | Group home (about, members count, recent activity) |
| `/app/my-groups` | Creator/admin list — My Groups |
| `/app/my-groups/:id/moderate` | Moderation tools (later; can start as same page with admin actions) |

Names can change; keep **Groups** in the public nav and **My Groups** in the account menu.

## Not the same as

| Feature | Difference |
|---------|------------|
| **Learn** | Editorial / curated knowledge — not a live club |
| **Consultations** | Named specialists + appointment CTA |
| **Friends** | Person↔person social graph |
| **Facebook outreach groups** | External marketing; see [social-groups-outreach.md](./social-groups-outreach.md) |

## Implementation stages (when the time comes)

### Stage 0 — decide when

Enough active members that empty catalogs and spam are real problems we can learn from. Until then keep this doc only.

### Stage 1 — create + catalog

- Create group (name, description, topic tags).
- Catalog `/groups` + search.
- Nav: Groups + My Groups.
- Creator = admin; join as member (open join first).

**Done when:** member creates a group, finds it in catalog, sees it under My Groups.

### Stage 2 — activity inside the group

- Group feed or discussion thread (reuse feed primitives if possible — do not fork a second social stack blindly).
- Basic moderation: remove post, remove member.

### Stage 3 — richer discovery

- Advanced filters (species, topic, city, activity).
- Request-to-join / private groups if abuse requires it.

### Stage 4 — not until it hurts

Co-admins matrix, paid group boosts, nested subgroups, full forum UX, cross-post to main feed by default.

## Open questions

- Public vs login-gated group pages for SEO.
- Whether “joined” and “created” share one My Groups UI with tabs.
- Soft limits (max groups per user) to curb spam.
- Link from a group to Learn shelves / consultants without merging products.

## Decisions that do not change (for now)

- Groups are **member-created clubs**, not platform editorial sections.
- **Any account** can create; ownership of pets is optional.
- **Groups** in the general left menu (discover + search).
- **My Groups** in the account/local menu = groups I admin (started as creator).
- Do **not** start coding until beta membership volume justifies it.
