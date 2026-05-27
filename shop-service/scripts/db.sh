#!/usr/bin/env sh

set -eu

COMMAND="${1:-}"
VALUE="${2:-}"
LIQUIBASE_URL="${LIQUIBASE_URL:-jdbc:postgresql://localhost:5433/shop_service}"
LIQUIBASE_USERNAME="${LIQUIBASE_USERNAME:-postgres}"
LIQUIBASE_PASSWORD="${LIQUIBASE_PASSWORD:-postgres}"

mvn_liquibase() {
  mvn -pl shop-service -DskipTests \
    "-Dliquibase.url=${LIQUIBASE_URL}" \
    "-Dliquibase.username=${LIQUIBASE_USERNAME}" \
    "-Dliquibase.password=${LIQUIBASE_PASSWORD}" \
    "$@"
}

if [ -z "$COMMAND" ]; then
  echo "Usage: sh shop-service/scripts/db.sh <status|update|rollback-last|tag|rollback-tag> [value]"
  echo "Override target DB with LIQUIBASE_URL, LIQUIBASE_USERNAME, and LIQUIBASE_PASSWORD."
  exit 1
fi

case "$COMMAND" in
  status)
    mvn_liquibase liquibase:status
    ;;
  update)
    mvn_liquibase liquibase:update
    ;;
  rollback-last)
    mvn_liquibase "-Dliquibase.rollbackCount=${VALUE:-1}" liquibase:rollback
    ;;
  tag)
    if [ -z "$VALUE" ]; then
      echo "Usage: sh shop-service/scripts/db.sh tag <tag>"
      exit 1
    fi
    mvn_liquibase "-Dliquibase.tag=$VALUE" liquibase:tag
    ;;
  rollback-tag)
    if [ -z "$VALUE" ]; then
      echo "Usage: sh shop-service/scripts/db.sh rollback-tag <tag>"
      exit 1
    fi
    mvn_liquibase "-Dliquibase.rollbackTag=$VALUE" liquibase:rollback
    ;;
  *)
    echo "Usage: sh shop-service/scripts/db.sh <status|update|rollback-last|tag|rollback-tag> [value]"
    echo "Override target DB with LIQUIBASE_URL, LIQUIBASE_USERNAME, and LIQUIBASE_PASSWORD."
    exit 1
    ;;
esac
