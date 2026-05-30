# MVP stabilization sprint (May 2026)

## Scope

- Feed + marketplace + inquiry flows smoke pass.
- Product event instrumentation in backend logs.
- UX consistency updates for inquiry inbox/thread states.
- Inbox quality pass: unread badge, polling, read-state alignment.

## Smoke checklist

- Routes reviewed: `/feed`, `/marketplace`, `/marketplace/:id`.
- Cabinet routes reviewed: `/app/my-listings`, `/app/marketplace-inquiries`, `/app/marketplace-inquiries/:id`.
- Draft/active listing transitions and inquiry flows covered during code pass.

## Bug list snapshot

- **P1 fixed:** inquiry thread API previously returned stale `unreadCount` because read-state was updated after thread fetch.
  - Fix: mark as read first, then return the thread from the backend route.
- **P1 fixed:** inquiry inbox empty-state text was not role-aware.
  - Fix: empty state now maps to current filter (`all`, `customer`, `seller`).
- **P1 fixed:** no quick way to see unread inquiry activity in navigation.
  - Fix: unread badge + polling in account menu/avatar.

## Instrumented events

- `listing_created`
- `listing_updated`
- `listing_published`
- `listing_viewed`
- `inquiry_started`
- `inquiry_replied`

All events are logged as structured JSON records with timestamp and contextual IDs.

## Cycle outcome

- MVP flow is more stable and easier to monitor in logs.
- Messaging UX is clearer for active conversations.
- Selected next product priority: **marketplace ranking + filters**.
