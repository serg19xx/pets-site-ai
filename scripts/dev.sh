#!/usr/bin/env bash
# Start Postgres + backend API (:8080) + Nuxt web (:3000).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

# shellcheck source=scripts/lib.sh
source "${ROOT}/scripts/lib.sh"
require_docker

if [[ ! -f "${ROOT}/backend/.env" ]]; then
  cp "${ROOT}/backend/.env.example" "${ROOT}/backend/.env"
fi
if [[ ! -f "${ROOT}/web/.env" ]]; then
  cp "${ROOT}/web/.env.example" "${ROOT}/web/.env"
fi

echo "Starting Postgres..."
docker compose up -d postgres
wait_for_postgres

if docker compose ps --status running api 2>/dev/null | grep -q api; then
  docker compose stop api
fi

for dir in backend web; do
  if [[ ! -d "${ROOT}/${dir}/node_modules" ]]; then
    echo "Installing ${dir}..."
    (cd "${ROOT}/${dir}" && npm install)
  fi
done

pids=()
cleanup() {
  echo ""
  echo "Stopping..."
  for pid in "${pids[@]}"; do
    kill -0 "${pid}" 2>/dev/null && kill "${pid}" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM

echo "Freeing ports..."
free_port 3000
free_port 8080

echo "Running database migrations..."
(cd "${ROOT}/backend" && npm run db:migrate)

echo "Starting backend and Nuxt..."
(cd "${ROOT}/backend" && npm run dev) &
pids+=($!)
(cd "${ROOT}/web" && NUXT_TELEMETRY_DISABLED=1 npm run dev) &
pids+=($!)

echo "Waiting..."
web_ok=0
api_ok=0
wait_for_port 8080 "API" && api_ok=1 || true
wait_for_port 3000 "Nuxt" && web_ok=1 || true

echo ""
if [[ "${web_ok}" -eq 1 && "${api_ok}" -eq 1 ]]; then
  echo "  >>> OPEN IN BROWSER:  http://localhost:3000"
  echo "      Gallery   http://localhost:3000/"
  echo "      Login     http://localhost:3000/login"
  echo "      Cabinet   http://localhost:3000/app/profile"
else
  echo "  START FAILED. Check errors above."
  [[ "${web_ok}" -eq 0 ]] && echo "  - Nuxt missing on :3000"
  [[ "${api_ok}" -eq 0 ]] && echo "  - API missing on :8080"
fi
echo ""

wait || true
cleanup
