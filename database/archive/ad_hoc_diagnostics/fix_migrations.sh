#!/bin/bash
docker exec -i plan-management-system-db-1 psql -U plan_user -d plan_management -c "INSERT INTO \"SequelizeMeta\" (name) VALUES ('20260901000001-baseline-full-schema.js') ON CONFLICT DO NOTHING;"
sed -i 's/RUN_DB_MIGRATIONS=false/RUN_DB_MIGRATIONS=true/g' /root/.LandAuthority/plan-management-system/.env
sed -i 's/RUN_DB_SEEDERS=false/RUN_DB_SEEDERS=true/g' /root/.LandAuthority/plan-management-system/.env
sed -i 's/RUN_COLLABORATION_MIGRATIONS=false/RUN_COLLABORATION_MIGRATIONS=true/g' /root/.LandAuthority/plan-management-system/.env
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml restart backend
