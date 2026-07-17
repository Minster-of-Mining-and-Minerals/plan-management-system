#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
npx sequelize-cli db:migrate

echo "[entrypoint] Starting API..."
exec node app.js
