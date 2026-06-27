#!/usr/bin/env bash
# Import a .sql dump into local Docker Postgres.
#
# Usage:
#   ./scripts/import-local-db.sh path/to/dump.sql
#   ./scripts/import-local-db.sh --reset path/to/dump.sql   # wipe volume first
#
set -euo pipefail

cd "$(dirname "$0")/.."

RESET=false
DUMP_FILE=""

for arg in "$@"; do
  if [[ "$arg" == "--reset" ]]; then
    RESET=true
  elif [[ -z "$DUMP_FILE" ]]; then
    DUMP_FILE="$arg"
  fi
done

if [[ -z "$DUMP_FILE" || ! -f "$DUMP_FILE" ]]; then
  echo "Usage: $0 [--reset] path/to/dump.sql"
  exit 1
fi

if [[ "$RESET" == true ]]; then
  echo "Resetting local Docker database..."
  docker compose down -v
fi

docker compose up -d
until docker compose exec -T postgres pg_isready -U postgres -d dogmate_dev >/dev/null 2>&1; do
  sleep 1
done

echo "Importing ${DUMP_FILE}..."
set +e
docker compose exec -T postgres psql -U postgres -d dogmate_dev -v ON_ERROR_STOP=0 < "$DUMP_FILE"
set -e

echo "Import complete."
docker compose exec -T postgres psql -U postgres -d dogmate_dev -c "SELECT COUNT(*) AS users FROM user_accounts;"
