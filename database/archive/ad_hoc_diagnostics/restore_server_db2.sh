docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml stop backend frontend
docker exec plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'false' WHERE datname = 'plan_management';"
docker exec plan-management-system-db-1 psql -U plan_user -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'plan_management';"
docker exec plan-management-system-db-1 psql -U plan_user -d postgres -c "DROP DATABASE IF EXISTS plan_management;"
docker exec plan-management-system-db-1 psql -U plan_user -d postgres -c "CREATE DATABASE plan_management;"
docker exec plan-management-system-db-1 psql -U plan_user -d postgres -c "UPDATE pg_database SET datallowconn = 'true' WHERE datname = 'plan_management';"

docker cp /root/.LandAuthority/plan-management-system/database/backups/pms_full_backup.dump plan-management-system-db-1:/tmp/pms_full_backup.dump
docker exec plan-management-system-db-1 pg_restore -U plan_user -d plan_management -O -x -1 /tmp/pms_full_backup.dump

docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml start backend frontend
