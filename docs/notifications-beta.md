# Notifications & beta tester messaging

Soft-launch system for **in-app messages + email**, feature announces to testers, and feedback decisions.

## Principles

1. Product code creates a **notification event** (never sends email ad hoc for these flows).
2. `notifyUser()` writes the in-app row, then runs **channel adapters**.
3. Email uses the existing transport (`RESEND_API_KEY` → Resend, else `SMTP_*` → SMTP, else console).
4. SMS is reserved (`notification_deliveries.channel = sms` → skipped until Twilio/etc.).

## Types

| Type | When |
|------|------|
| `feature_announce` | Admin sends Announce to all `is_beta_tester` users |
| `feedback_reply` | Admin replies on a tester’s ticket |
| `feedback_decision` | Admin accepts/rejects an improvement (with required reason) |

## Admin UI

- **Announce** — title, body, optional `linkPath` (e.g. `/app/my-pets/new`)
- **Feedback detail** — Accept / Reject improvement + reason (counts for bonuses)
- **Testers** — bugs filed + accepted improvements (score = sum)

## Member UI

- `/app/notifications` — inbox; badge in user menu
- Email mirror of the same message (best-effort; failures logged on delivery row)

## Bonus scoring

- **Bugs:** count of bug tickets created by the tester  
- **Improvements:** only `improvement_decision = accepted`  
- Rejected / pending improvements do not count  

## Migrations

- `025_notifications.sql`
- `026_feedback_improvement_decision.sql`

## Future — feedback as a shared blog / forum (if beta scales)

**Today:** each founding tester opens a **private ticket** to admin/developer (`/app/feedback`). Good for soft launch: simple, private, scored for bonuses.

**Later (if engagement justifies it):** surface bugs and improvements more like a **shared discussion board / changelog blog**, not only 1:1 tickets.

### Why

- **Less duplicate tickets** — testers see an existing report before filing the same bug again.
- **Shared context** — people understand what is known, in progress, or fixed.
- **New ideas** — comments on a thread can spawn improvements the original reporter did not think of.
- **Trust** — the community sees that feedback is real work, not a black hole.

### Suggested shape (not implemented)

| Layer | Role |
|-------|------|
| Keep private tickets | Sensitive details, screenshots, PII, account-specific issues |
| Public threads | Summarized bug/improvement posts (title + status + short body) |
| Comments | Testers discuss, confirm “me too”, suggest variants |
| Status labels | `open` / `confirmed` / `in progress` / `shipped` (admin-owned) |
| Link back | Ticket ↔ public thread when appropriate |

### Rules of thumb

- Backend still owns decisions (accept / reject / ship); the board is language and visibility, not a second bug tracker for ops.
- Opt-in or beta-only at first; do not dump raw private tickets onto the public web.
- Bonus scoring can stay on ticket activity + accepted improvements; “me too” / useful comments are optional later signals.
- Do not build this until private tickets prove noisy (duplicates) or testers ask for visibility — current MVP is enough for the first cohort.

---
