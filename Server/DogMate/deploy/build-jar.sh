#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

if [ -x ./mvnw ]; then
  echo "Building jar with ./mvnw"
  ./mvnw clean package -DskipTests
elif command -v mvn >/dev/null 2>&1; then
  echo "Building jar with mvn"
  mvn clean package -DskipTests
else
  echo "ERROR: No ./mvnw or mvn command found. Install Maven or restore ./mvnw." >&2
  exit 1
fi

echo "Build complete. Jar is in target/"
