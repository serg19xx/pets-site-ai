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

wait_for_port() {
  local port="$1"
  local label="$2"
  local i
  for i in $(seq 1 60); do
    if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  echo "error: ${label} did not start on port ${port}." >&2
  return 1
}

free_port() {
  local port="$1"
  local pids
  pids="$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "Freeing port ${port}..."
    # shellcheck disable=SC2086
    kill ${pids} 2>/dev/null || true
    sleep 0.5
  fi
}
