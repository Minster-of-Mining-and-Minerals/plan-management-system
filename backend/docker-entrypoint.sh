#!/bin/sh
set -e

cd /app

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  npx sequelize-cli db:migrate
fi

if [ "${RUN_DB_SEEDERS:-false}" = "true" ]; then
  echo "Running database seeders..."
  npx sequelize-cli db:seed:all
fi

exec "$@"
