#!/usr/bin/env bash
# Stop Compose services for this project (containers removed; volumes kept).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

source "${ROOT}/scripts/lib.sh"
require_docker

docker compose down
echo "Compose stack stopped (volumes preserved). Use 'docker compose down -v' to drop DB data."
