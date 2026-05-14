# n8n agents (versioned assets)

**Runtime:** n8n is installed on your **VPS**. This repo does not run n8n in Docker.

This folder is for **Git-tracked** artifacts tied to that instance:

- Workflow JSON **exported** from the VPS UI (or API) when you want history, review, or disaster recovery in Git.
- Operator **docs** (variable names, webhook paths, integration notes) — **never** real secrets.

**Secrets:** keep credentials in n8n on the VPS or in a secret manager; here reference only names and non-sensitive URLs (e.g. public webhook base path if needed).

Suggested layout (optional):

```
agents/n8n/
  README.md          # this file
  workflows/         # exported *.json from n8n
  docs/              # runbooks (no secrets)
```
