#!/usr/bin/env bash
# Build and start full stack in Docker (Postgres + API).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

source "${ROOT}/scripts/lib.sh"
require_docker

docker compose up -d --build
echo "Done."
echo "  API:    http://localhost:8080/api/health"
echo "  DB:     localhost:5432"
