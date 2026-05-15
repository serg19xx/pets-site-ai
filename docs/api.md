# API documentation (OpenAPI / Swagger)

The backend serves **interactive API docs** and a machine-readable **OpenAPI 3** spec.

## URLs (local)

With the API on port **8080** (Docker or `npm run dev` in `backend/`):

| Resource | URL |
|----------|-----|
| **Swagger UI** (try endpoints in the browser) | [http://localhost:8080/api/docs](http://localhost:8080/api/docs) |
| **OpenAPI JSON** (for codegen, Postman import, etc.) | [http://localhost:8080/api/docs/json](http://localhost:8080/api/docs/json) |

If the API runs behind another host or port, replace `localhost:8080` accordingly.

## For developers

- New routes should declare a **JSON Schema** on the route (`schema` in Fastify) so they appear in Swagger automatically.
- Reusable response shapes can live under `backend/src/schemas/`.
- After adding endpoints, open Swagger UI and use **Try it out** to verify requests and responses.

## For external integrators

Share:

1. The **OpenAPI JSON** URL (stable contract), or export the file from `/api/docs/json`.
2. Base path for REST calls: **`/api`** (e.g. `GET /api/health`).

Authentication is not implemented yet; when it is, document security schemes in `backend/src/openapi.ts` and on each route.
