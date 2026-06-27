#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

docker compose up -d
echo "Waiting for Postgres..."
until docker compose exec -T postgres pg_isready -U postgres -d dogmate_dev >/dev/null 2>&1; do
  sleep 1
done

./mvnw spring-boot:run
