#!/usr/bin/env bash
# Start Postgres in Docker, then backend + frontend dev servers (Ctrl+C stops all).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

# shellcheck source=scripts/lib.sh
source "${ROOT}/scripts/lib.sh"
require_docker

if [[ ! -f "${ROOT}/backend/.env" ]]; then
  echo "Creating backend/.env from backend/.env.example (edit DATABASE_URL if needed)."
  cp "${ROOT}/backend/.env.example" "${ROOT}/backend/.env"
fi

if [[ ! -f "${ROOT}/frontend/.env" ]]; then
  echo "Creating frontend/.env from frontend/.env.example."
  cp "${ROOT}/frontend/.env.example" "${ROOT}/frontend/.env"
fi

echo "Starting Postgres (docker compose)..."
docker compose up -d postgres
wait_for_postgres

if [[ ! -d "${ROOT}/backend/node_modules" ]]; then
  echo "Installing backend dependencies..."
  (cd "${ROOT}/backend" && npm install)
fi

if [[ ! -d "${ROOT}/frontend/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  (cd "${ROOT}/frontend" && npm install)
fi

pids=()
cleanup() {
  echo ""
  echo "Stopping dev servers..."
  for pid in "${pids[@]}"; do
    if kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM

echo "Starting backend (http://localhost:8080) and frontend (Vite)..."
(cd "${ROOT}/backend" && npm run dev) &
pids+=($!)
(cd "${ROOT}/frontend" && npm run dev) &
pids+=($!)

wait || true
cleanup
