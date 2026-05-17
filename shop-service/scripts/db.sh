#!/usr/bin/env sh

set -eu

COMMAND="${1:-}"
VALUE="${2:-}"

if [ -z "$COMMAND" ]; then
  echo "Usage: sh shop-service/scripts/db.sh <status|update|rollback-last|tag|rollback-tag> [value]"
  exit 1
fi

case "$COMMAND" in
  status)
    mvn -pl shop-service -DskipTests liquibase:status
    ;;
  update)
    mvn -pl shop-service -DskipTests liquibase:update
    ;;
  rollback-last)
    mvn -pl shop-service -DskipTests -Dliquibase.rollbackCount="${VALUE:-1}" liquibase:rollback
    ;;
  tag)
    if [ -z "$VALUE" ]; then
      echo "Usage: sh shop-service/scripts/db.sh tag <tag>"
      exit 1
    fi
    mvn -pl shop-service -DskipTests -Dliquibase.tag="$VALUE" liquibase:tag
    ;;
  rollback-tag)
    if [ -z "$VALUE" ]; then
      echo "Usage: sh shop-service/scripts/db.sh rollback-tag <tag>"
      exit 1
    fi
    mvn -pl shop-service -DskipTests -Dliquibase.rollbackTag="$VALUE" liquibase:rollback
    ;;
  *)
    echo "Usage: sh shop-service/scripts/db.sh <status|update|rollback-last|tag|rollback-tag> [value]"
    exit 1
    ;;
esac
