# User uploads (avatars & pet photos)

Uploaded images and videos are **files on disk**, not in PostgreSQL. The database only stores relative paths (e.g. `avatars/user-7-abc.jpg`, `pets/gallery/pet-45-abc.jpg`, `posts/post-12-abc.mp4`). If the file is missing, the UI shows a broken asset while the row still exists.

| Content | Folder |
|---------|--------|
| Profile avatars | `avatars/` |
| Pet gallery | `pets/gallery/` |
| Feed post media | `posts/` |
| Marketplace listing photos | `listings/` |

## Where files live

| Mode | API process | Files on disk |
|------|-------------|---------------|
| `./scripts/dev.sh` (default) | Host (`backend/npm run dev`) | `backend/uploads/` in the repo |
| `docker compose up api` | Container | Same folder via bind mount `./backend/uploads` → `/app/uploads` |

Public URLs: `http://localhost:8080/api/uploads/<relative-path>` (proxied through Nuxt in dev).

## Local development

- Postgres runs in Docker; **uploads stay on your Mac** under `backend/uploads/`.
- Restarting the API or rebuilding containers does **not** delete uploads when using the compose bind mount above.
- Uploads are **gitignored** — commit code, not user photos.

## Production (VPS / server)

1. **Keep one persistent directory** on the server, e.g. `/var/lib/pets/uploads`, and set in `backend/.env`:
   ```env
   UPLOADS_DIR=/var/lib/pets/uploads
   ```
2. In `docker-compose.yml` (or your deploy compose), mount that path into the API container:
   ```yaml
   volumes:
     - /var/lib/pets/uploads:/app/uploads
   environment:
     UPLOADS_DIR: /app/uploads
   ```
3. **Back up together**: PostgreSQL data **and** the uploads directory. Restoring only the DB leaves orphan paths.
4. Ensure the API process user can read/write the uploads directory.

## Optional later: object storage (S3, R2, etc.)

For multiple app servers or CDN, you would store blobs in object storage and save URLs in the DB. That is not implemented yet; today everything uses `UPLOADS_DIR` on disk.
