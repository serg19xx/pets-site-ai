# Marketplace inquiry notifications (email & SMS)

## Status (remember)

| Channel | v1 now | Later |
|---------|--------|--------|
| **Email** | Works with Resend or SMTP (`backend/.env`) | — |
| **SMS** | **Stub only** — UI toggles + API logs to terminal; optional backup email | **Twilio** — configure `TWILIO_*` when ready; code path already exists |

**Decision:** Do not block marketplace messaging on SMS. Twilio setup is **deferred**; behaviour until then is intentional (console log, not a bug).

---

When someone messages a listing, the **seller** can get:

- **Email** — if “Email me…” is checked on the listing (default on).
- **SMS** — only if “SMS me…” is checked **and** a phone number is available.

Buyers always get **email** on replies (account email). SMS for buyers is not implemented yet.

## Email

Same setup as signup/password: `RESEND_API_KEY` or `SMTP_*` in `backend/.env`. See [uploads.md](./uploads.md) project docs and `backend/.env.example`.

## SMS (Twilio)

Without Twilio, SMS is **not sent to a phone**. The API prints the text in the **backend console**:

```text
--- PETS SMS (Twilio not configured) ---
To: +1...
...
```

If email alerts are off but SMS is on, a **backup email** is sent to the seller explaining that Twilio is missing.

### Enable real SMS

1. Create a [Twilio](https://www.twilio.com/) account and a phone number.
2. In `backend/.env`:

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+15551234567
```

3. Restart the API (`./scripts/dev.sh` or `npm run dev` in `backend/`).
4. On startup you should see: `SMS: sending via Twilio`.
5. Edit your listing → enable **SMS me** → set phone in **E.164** (e.g. `+14165551234`), or use listing contact phone / profile phone.

Phone priority: listing **SMS phone** field → listing **contact phone** → seller **profile phone**.

## Listing settings

Per listing (edit form in **My listings**):

- Email / SMS toggles
- Optional SMS-only phone override

Global defaults in user **Preferences** are planned later.
