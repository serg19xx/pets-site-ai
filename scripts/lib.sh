#!/usr/bin/env bash
# Shared helpers for scripts in this repo (sourced, not executed).

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "error: docker not found. Install Docker Desktop and try again." >&2
    exit 1
  fi
}

wait_for_postgres() {
  local user="${POSTGRES_USER:-pets}"
  local db="${POSTGRES_DB:-pets}"
  local i
  echo "Waiting for Postgres (user=${user}, db=${db})..."
  for i in $(seq 1 40); do
    if docker compose exec -T postgres pg_isready -U "${user}" -d "${db}" >/dev/null 2>&1; then
      echo "Postgres is ready."
      return 0
    fi
    sleep 1
  done
  echo "error: Postgres did not become ready in time." >&2
  exit 1
}
