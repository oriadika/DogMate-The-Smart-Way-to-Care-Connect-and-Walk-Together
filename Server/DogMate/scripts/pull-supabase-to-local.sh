#!/usr/bin/env bash
# One-time (or repeatable) pull from Supabase → local Docker Postgres (dogmate_dev).
#
# Prerequisites:
#   1. Copy .env.example → .env and set SUPABASE_PASSWORD (Dashboard → Settings → Database)
#   2. Docker running
#   3. Stop Spring Boot if running (Ctrl+C) — import wipes the local DB volume
#
# Usage:
#   ./scripts/pull-supabase-to-local.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

SUPABASE_HOST="${SUPABASE_HOST:-aws-1-ap-southeast-1.pooler.supabase.com}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"
SUPABASE_USER="${SUPABASE_USER:-postgres.xdaxkncdjhlqlupaxuzd}"
SUPABASE_PASSWORD="${SUPABASE_PASSWORD:-${SPRING_DATASOURCE_PASSWORD:-}}"

if [[ -z "${SUPABASE_PASSWORD}" ]]; then
  echo "ERROR: Set SUPABASE_PASSWORD in Server/DogMate/.env (see .env.example)"
  exit 1
fi

SEED_DIR="db/seed"
mkdir -p "$SEED_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP_FILE="${SEED_DIR}/supabase-${STAMP}.sql"

echo "==> Pulling public schema from Supabase (${SUPABASE_HOST}:${SUPABASE_PORT})..."
docker run --rm \
  -e PGPASSWORD="${SUPABASE_PASSWORD}" \
  postgres:17-alpine \
  pg_dump \
    -h "${SUPABASE_HOST}" \
    -p "${SUPABASE_PORT}" \
    -U "${SUPABASE_USER}" \
    -d "${SUPABASE_DB}" \
    --schema=public \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
  > "${DUMP_FILE}"

BYTES="$(wc -c < "${DUMP_FILE}" | tr -d ' ')"
if [[ "${BYTES}" -lt 1000 ]]; then
  echo "ERROR: Dump file is too small (${BYTES} bytes). Check Supabase credentials / network bans."
  exit 1
fi

cp -f "${DUMP_FILE}" "${SEED_DIR}/supabase-latest.sql"
echo "    Saved: ${DUMP_FILE}"

echo "==> Resetting local Docker database (docker compose down -v)..."
docker compose down -v
docker compose up -d

echo "==> Waiting for Postgres..."
until docker compose exec -T postgres pg_isready -U postgres -d dogmate_dev >/dev/null 2>&1; do
  sleep 1
done

echo "==> Importing into dogmate_dev..."
# Some Supabase-only extensions may warn; keep going unless psql hard-fails.
set +e
docker compose exec -T postgres psql -U postgres -d dogmate_dev -v ON_ERROR_STOP=0 < "${DUMP_FILE}"
IMPORT_STATUS=$?
set -e

if [[ "${IMPORT_STATUS}" -ne 0 ]]; then
  echo "WARN: psql exited with ${IMPORT_STATUS} (often harmless extension warnings)."
fi

USER_COUNT="$(docker compose exec -T postgres psql -U postgres -d dogmate_dev -t -A -c "SELECT COUNT(*) FROM user_accounts;" 2>/dev/null || echo "?")"
echo ""
echo "==> Import finished."
echo "    Users in local DB: ${USER_COUNT}"
echo ""
echo "Next steps:"
echo "  1. Set dogmate.local.seed.enabled=false in application.properties (DB already has data)"
echo "  2. ./mvnw spring-boot:run"
echo "  3. Expo: npm start  (same Wi‑Fi → local API on :8080)"
