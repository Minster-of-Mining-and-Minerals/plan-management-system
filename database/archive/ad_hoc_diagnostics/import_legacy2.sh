#!/bin/bash
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml stop backend frontend nginx
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'false' WHERE datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "DROP DATABASE IF EXISTS plan_management;"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "CREATE DATABASE plan_management;"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'true' WHERE datname = 'plan_management';"

echo "Restoring database from SQL backup..."
docker exec -i plan-management-system-db-1 psql -U plan_user -d plan_management < /root/.LandAuthority/plan-management-system/database/backups/pms_backup_2026-06-16_115430.sql

sed -i 's/RUN_DB_MIGRATIONS=false/RUN_DB_MIGRATIONS=true/g' /root/.LandAuthority/plan-management-system/.env
sed -i 's/RUN_DB_SEEDERS=false/RUN_DB_SEEDERS=true/g' /root/.LandAuthority/plan-management-system/.env

# Restart backend but disable migrations momentarily to copy files
sed -i 's/RUN_DB_MIGRATIONS=true/RUN_DB_MIGRATIONS=false/g' /root/.LandAuthority/plan-management-system/.env
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml up -d backend

sleep 5

docker exec -i plan-management-system-backend-1 mkdir -p /app/migrations/_legacy/utils
docker cp /root/permissionSeedUtils.js plan-management-system-backend-1:/app/migrations/_legacy/utils/permissionSeedUtils.js

docker exec -i plan-management-system-db-1 psql -U plan_user -d plan_management -c "INSERT INTO \"SequelizeMeta\" (name) VALUES ('20260901000001-baseline-full-schema.js') ON CONFLICT DO NOTHING;"

echo "Running legacy migrations..."
docker exec -i plan-management-system-backend-1 npx sequelize-cli db:migrate --migrations-path /app/migrations/_legacy/pre_squash_20260716/

sed -i 's/RUN_DB_MIGRATIONS=false/RUN_DB_MIGRATIONS=true/g' /root/.LandAuthority/plan-management-system/.env
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml restart backend
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml up -d
