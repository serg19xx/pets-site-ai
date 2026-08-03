#!/usr/bin/env bash
# Shared helpers for scripts in this repo (sourced, not executed).

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "error: docker not found. Install Docker Desktop and try again." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "error: Docker daemon is not running (no docker.sock)." >&2
    echo "  Open Docker Desktop, wait until it says Running, then retry." >&2
    echo "  Check: docker info" >&2
    exit 1
  fi
}

host_port_open() {
  local host="$1"
  local port="$2"
  if command -v nc >/dev/null 2>&1; then
    # -G: macOS connect timeout (seconds)
    nc -z -G 1 "${host}" "${port}" >/dev/null 2>&1 && return 0
    nc -z -w 1 "${host}" "${port}" >/dev/null 2>&1 && return 0
    return 1
  fi
  (echo >/dev/tcp/"${host}"/"${port}") >/dev/null 2>&1
}

postgres_published_port() {
  # e.g. "0.0.0.0:5432" or "127.0.0.1:5432"
  docker compose port postgres 5432 2>/dev/null | head -1
}

wait_for_postgres() {
  local user="${POSTGRES_USER:-pets}"
  local db="${POSTGRES_DB:-pets}"
  local port="${POSTGRES_PORT:-5432}"
  local i
  local published=""

  echo "Waiting for Postgres (user=${user}, db=${db})..."
  for i in $(seq 1 60); do
    if docker compose exec -T postgres pg_isready -U "${user}" -d "${db}" >/dev/null 2>&1; then
      published="$(postgres_published_port || true)"
      if [[ -n "${published}" ]] && host_port_open "127.0.0.1" "${port}"; then
        echo "Postgres is ready (host ${published})."
        return 0
      fi
      # Container is healthy but host port not mapped yet — recreate once.
      if [[ "${i}" -eq 15 ]]; then
        echo "Host port ${port} not published yet; recreating postgres..."
        docker compose up -d --force-recreate postgres >/dev/null
      fi
    fi
    sleep 1
  done

  echo "error: Postgres container is up but host cannot reach 127.0.0.1:${port}." >&2
  echo "  docker compose port postgres 5432 → $(postgres_published_port || echo 'EMPTY')" >&2
  echo "  docker compose ps" >&2
  docker compose ps >&2 || true
  echo "" >&2
  echo "Docker Desktop often needs a full restart after an update:" >&2
  echo "  1) Quit Docker Desktop → open again → wait for Running" >&2
  echo "  2) Settings → General → ensure 'Open Docker Desktop when you start your computer' is fine" >&2
  echo "  3) Then: docker compose down && ./scripts/dev.sh" >&2
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
