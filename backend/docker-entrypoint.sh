#!/bin/sh
set -e

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Running database migrations..."
  npx sequelize-cli db:migrate
else
  echo "[entrypoint] Skipping database migrations..."
fi

if [ "${RUN_DB_SEEDERS:-false}" = "true" ]; then
  echo "[entrypoint] Running database seeders..."
  npm run seed
else
  echo "[entrypoint] Skipping database seeders..."
fi

echo "[entrypoint] Starting API..."
exec node app.js
