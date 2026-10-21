#!/bin/bash
docker exec -i plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'true' WHERE datname = 'plan_management';"
docker exec -i plan-management-system-db-1 psql -U plan_user -d plan_management -c "DELETE FROM \"SequelizeMeta\" WHERE name = '20260901000001-baseline-full-schema.js';"
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml restart backend
