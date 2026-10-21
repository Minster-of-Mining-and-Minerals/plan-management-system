#!/bin/bash
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml stop backend

# Drop existing databases and create a fresh one
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'false' WHERE datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "DROP DATABASE IF EXISTS plan_management;"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "CREATE DATABASE plan_management;"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'true' WHERE datname = 'plan_management';"

# Enable migrations and seeders
sed -i 's/RUN_DB_MIGRATIONS=false/RUN_DB_MIGRATIONS=true/g' /root/.LandAuthority/plan-management-system/.env
sed -i 's/RUN_DB_SEEDERS=false/RUN_DB_SEEDERS=true/g' /root/.LandAuthority/plan-management-system/.env

# Restart backend to run baseline migration and seeders
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml up -d backend
