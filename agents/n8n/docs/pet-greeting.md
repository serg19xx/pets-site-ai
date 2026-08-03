# Workflow: Pet Greeting

Generates short first-person pet greetings (Identity / Self-introduction) via OpenAI — **English and French in one call**.

**Export file:** [`../workflows/pet-greeting.json`](../workflows/pet-greeting.json)

## Contract

### Request (API → n8n)

`POST` production webhook path: `/webhook/petsbook/pet-greeting`

Header auth (Header Auth credential in n8n):

| Header name | Value |
|-------------|--------|
| `X-Petsbook-Secret` | same as API env `N8N_WEBHOOK_SECRET` |

JSON body:

```json
{
  "name": "Oslo",
  "speciesLabel": "Cat",
  "speciesSlug": "cat",
  "breedLabel": "Bengal",
  "sex": "male",
  "description": "Loves windowsills.",
  "dateOfBirth": "2025-03-01",
  "ageYears": 1
}
```

### Response (n8n → API)

```json
{
  "greeting": "Hi! I'm Oslo…",
  "greetingFr": "Bonjour! Je suis Oslo…"
}
```

Max length enforced in the workflow and again in the API: **500** characters per language.

Stored as `pets.greeting` (EN) + `pets.greeting_fr` (FR).

## Import / update on OVH n8n

If the workflow already exists: open **Prepare prompt**, **Parse greeting**, and **Respond**, replace their code/body from the export (or re-import and re-attach credentials).

1. Open https://n8n.websmith-shop.com → **Workflows** → **Import from File** (or edit live nodes)
2. Select `agents/n8n/workflows/pet-greeting.json`
3. Credentials:
   - **Header Auth**: Name `X-Petsbook-Secret`, Value = shared secret
   - **OpenAI** API key
4. Attach credentials → **Publish / Activate**
5. API env:

```bash
N8N_PET_GREETING_WEBHOOK_URL=https://n8n.websmith-shop.com/webhook/petsbook/pet-greeting
N8N_WEBHOOK_SECRET=same-as-header-auth-value
```

Optional: `N8N_TIMEOUT_MS=20000`. On failure, API falls back to local EN+FR templates.

## Manual test

```bash
curl -sS -X POST "$N8N_PET_GREETING_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Petsbook-Secret: $N8N_WEBHOOK_SECRET" \
  -d '{
    "name": "Oslo",
    "speciesLabel": "Cat",
    "speciesSlug": "cat",
    "breedLabel": "Bengal",
    "sex": "male",
    "description": "Loves windowsills.",
    "dateOfBirth": "2025-03-01",
    "ageYears": 1
  }'
```

Expect `{ "greeting": "…", "greetingFr": "…" }`.

## Notes

- Do not commit OpenAI keys or webhook secrets.
- After editing the live workflow, re-export JSON into `workflows/`.
