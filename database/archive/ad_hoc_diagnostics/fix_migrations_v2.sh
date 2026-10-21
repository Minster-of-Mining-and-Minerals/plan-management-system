#!/bin/bash
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml stop backend

# Restore the old database
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'false' WHERE datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "DROP DATABASE plan_management;"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'false' WHERE datname = 'plan_management_old';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'plan_management_old';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "ALTER DATABASE plan_management_old RENAME TO plan_management;"

# Fix SequelizeMeta to ensure baseline is NOT marked, but old migrations are run
docker exec -i plan-management-system-db-1 psql -U plan_user -d plan_management -c "DELETE FROM \"SequelizeMeta\" WHERE name = '20260901000001-baseline-full-schema.js';"

# Un-squash migrations
cd /root/.LandAuthority/plan-management-system
mv backend/migrations/20260901000001-baseline-full-schema.js backend/migrations/_legacy/
mv backend/migrations/_legacy/pre_squash_20260716/*.js backend/migrations/

# Restart backend to run migrations
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml start backend
