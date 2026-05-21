#!/usr/bin/env bash
# Start Postgres only (for local API + Vite dev).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

source "${ROOT}/scripts/lib.sh"
require_docker

docker compose up -d postgres
wait_for_postgres
echo "Done. Postgres is up. Run backend/frontend dev from ./scripts/dev.sh or manually."
