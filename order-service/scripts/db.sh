#!/usr/bin/env sh

set -eu

COMMAND="${1:-}"
VALUE="${2:-}"

if [ -z "$COMMAND" ]; then
  echo "Usage: sh order-service/scripts/db.sh <status|update|rollback-last|tag|rollback-tag> [value]"
  exit 1
fi

case "$COMMAND" in
  status)
    mvn -pl order-service -DskipTests liquibase:status
    ;;
  update)
    mvn -pl order-service -DskipTests liquibase:update
    ;;
  rollback-last)
    mvn -pl order-service -DskipTests -Dliquibase.rollbackCount="${VALUE:-1}" liquibase:rollback
    ;;
  tag)
    if [ -z "$VALUE" ]; then
      echo "Usage: sh order-service/scripts/db.sh tag <tag>"
      exit 1
    fi
    mvn -pl order-service -DskipTests -Dliquibase.tag="$VALUE" liquibase:tag
    ;;
  rollback-tag)
    if [ -z "$VALUE" ]; then
      echo "Usage: sh order-service/scripts/db.sh rollback-tag <tag>"
      exit 1
    fi
    mvn -pl order-service -DskipTests -Dliquibase.rollbackTag="$VALUE" liquibase:rollback
    ;;
  *)
    echo "Usage: sh order-service/scripts/db.sh <status|update|rollback-last|tag|rollback-tag> [value]"
    exit 1
    ;;
esac
