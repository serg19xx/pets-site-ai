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
