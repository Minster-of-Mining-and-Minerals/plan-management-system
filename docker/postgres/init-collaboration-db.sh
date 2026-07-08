#!/bin/bash
set -euo pipefail

# Create the collaboration database on first Postgres startup (idempotent).
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" <<-EOSQL
	SELECT 'CREATE DATABASE collaboration_service'
	WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'collaboration_service')\gexec
EOSQL
