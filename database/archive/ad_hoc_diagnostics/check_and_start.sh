docker exec plan-management-system-db-1 psql -U plan_user -d plan_management -c "SELECT count(*) FROM plan_nodes;"
docker compose -f /root/.LandAuthority/plan-management-system/docker-compose.yml up -d
