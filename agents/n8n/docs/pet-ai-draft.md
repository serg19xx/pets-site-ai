# Workflow: Pet AI Draft

Generates bilingual first-person pet texts for AI drafts (`SELF_INTRODUCTION`, `PHOTO_POST`, `VETERINARY_VISIT`, …) via OpenAI — **English and French in one call**.

**Export file:** [`../workflows/pet-ai-draft.json`](../workflows/pet-ai-draft.json)

## Contract

### Request (API → n8n)

`POST` production webhook path: `/webhook/petsbook/pet-ai-draft`

Header auth (same credential as pet-greeting):

| Header name | Value |
|-------------|--------|
| `X-Petsbook-Secret` | same as API env `N8N_WEBHOOK_SECRET` |

JSON body (built by `pets-api`):

```json
{
  "templateKey": "PHOTO_POST",
  "templateInstructions": "Write a short first-person caption…",
  "promptText": "You are writing as the pet \"Oslo\"…",
  "eventHint": "Owner uploaded gallery photo #12 (PHOTO_UPLOADED).",
  "procedureLabel": null,
  "identity": {
    "name": "Oslo",
    "speciesLabel": "Cat",
    "speciesSlug": "cat",
    "breedLabel": "Bengal",
    "sex": "male",
    "dateOfBirth": "2025-03-01",
    "description": "Loves windowsills."
  }
}
```

### Response (n8n → API)

```json
{
  "body": "Look at this…",
  "bodyFr": "Regardez…"
}
```

Max length enforced in the workflow and again in the API: **2000** characters per language.

Stored in `pet_ai_drafts` (`body` = EN, `body_fr` = FR). Payload includes `"source": "n8n"` or `"local"`.

## Import on OVH n8n

1. Open https://n8n.websmith-shop.com → **Workflows** → **Import from File**
2. Select `agents/n8n/workflows/pet-ai-draft.json`
3. Credentials (reuse greeting ones):
   - **Header Auth**: Name `X-Petsbook-Secret`, Value = shared secret
   - **OpenAI** API key
4. Attach credentials → **Publish / Activate**
5. API / compose env:

```bash
N8N_PET_AI_DRAFT_WEBHOOK_URL=https://n8n.websmith-shop.com/webhook/petsbook/pet-ai-draft
N8N_WEBHOOK_SECRET=same-as-header-auth-value
```

Shared with greeting: `N8N_TIMEOUT_MS` (default 20000). On failure, API falls back to local EN+FR templates.

## Manual test

```bash
curl -sS -X POST "$N8N_PET_AI_DRAFT_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Petsbook-Secret: $N8N_WEBHOOK_SECRET" \
  -d '{
    "templateKey": "PHOTO_POST",
    "templateInstructions": "Write a short first-person caption for a newly shared photo.",
    "promptText": "You are writing as the pet Oslo, a cat. Personality energy 7/10.",
    "eventHint": "Owner uploaded gallery photo #1",
    "identity": {
      "name": "Oslo",
      "speciesLabel": "Cat",
      "speciesSlug": "cat",
      "breedLabel": "Bengal",
      "sex": "male",
      "dateOfBirth": "2025-03-01",
      "description": null
    }
  }'
```

Expect `{ "body": "…", "bodyFr": "…" }`.

## Notes

- Only runs when the pet has **virtual life** enabled.
- Costs OpenAI on create pet / photo upload / medical visit — keep an eye on usage in beta.
- Do not commit OpenAI keys or webhook secrets.
- After editing the live workflow, re-export JSON into `workflows/`.
