#!/bin/bash
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml stop backend frontend nginx
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'false' WHERE datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "DROP DATABASE IF EXISTS plan_management;"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "CREATE DATABASE plan_management;"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'true' WHERE datname = 'plan_management';"

echo "Restoring database from SQL backup..."
docker exec -i plan-management-system-db-1 psql -U plan_user -d plan_management < /root/.LandAuthority/plan-management-system/database/backups/pms_backup_2026-06-16_115430.sql

# Disable BOTH migrations and seeders to keep backend alive
sed -i 's/RUN_DB_MIGRATIONS=true/RUN_DB_MIGRATIONS=false/g' /root/.LandAuthority/plan-management-system/.env
sed -i 's/RUN_DB_SEEDERS=true/RUN_DB_SEEDERS=false/g' /root/.LandAuthority/plan-management-system/.env

# Create container without migrations/seeders
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml up -d backend
sleep 10

# Now the container is healthy and stable. Move legacy migrations!
docker exec -i plan-management-system-backend-1 sh -c "cp /app/migrations/_legacy/pre_squash_20260716/*.js /app/migrations/"

# Provide the missing permissionSeedUtils.js stub
docker exec -i plan-management-system-backend-1 mkdir -p /app/utils
docker cp /root/permissionSeedUtils.js plan-management-system-backend-1:/app/utils/permissionSeedUtils.js

# Mark baseline as skipped
docker exec -i plan-management-system-db-1 psql -U plan_user -d plan_management -c "INSERT INTO \"SequelizeMeta\" (name) VALUES ('20260901000001-baseline-full-schema.js') ON CONFLICT DO NOTHING;"

# Run legacy migrations inside container from default path
echo "Running legacy migrations..."
docker exec -i plan-management-system-backend-1 npx sequelize-cli db:migrate

# Re-enable migrations and seeders
sed -i 's/RUN_DB_MIGRATIONS=false/RUN_DB_MIGRATIONS=true/g' /root/.LandAuthority/plan-management-system/.env
sed -i 's/RUN_DB_SEEDERS=false/RUN_DB_SEEDERS=true/g' /root/.LandAuthority/plan-management-system/.env

# Restart backend so it runs seeders correctly
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml restart backend

sleep 10
# Start the rest
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml up -d
