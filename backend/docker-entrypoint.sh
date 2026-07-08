#!/bin/sh
set -e

cd /app

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  npx sequelize-cli db:migrate
fi

if [ "${RUN_COLLABORATION_MIGRATIONS:-true}" = "true" ]; then
  echo "Running collaboration database migrations..."
  (
    cd /collaboration-service
    COLLABORATION_DB_HOST="${COLLABORATION_DB_HOST:-$DB_HOST}" \
    COLLABORATION_DB_PORT="${COLLABORATION_DB_PORT:-$DB_PORT}" \
    COLLABORATION_DB_USERNAME="${COLLABORATION_DB_USERNAME:-$DB_USERNAME}" \
    COLLABORATION_DB_PASSWORD="${COLLABORATION_DB_PASSWORD:-$DB_PASSWORD}" \
    COLLABORATION_DB_NAME="${COLLABORATION_DB_NAME:-collaboration_service}" \
    /app/node_modules/.bin/sequelize-cli db:migrate
  )
fi

if [ "${RUN_DB_SEEDERS:-false}" = "true" ]; then
  echo "Running database seeders..."
  npx sequelize-cli db:seed:all
fi

exec "$@"
