#!/bin/bash
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'false' WHERE datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "ALTER DATABASE plan_management RENAME TO plan_management_old;"
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "CREATE DATABASE plan_management;"
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml restart backend
