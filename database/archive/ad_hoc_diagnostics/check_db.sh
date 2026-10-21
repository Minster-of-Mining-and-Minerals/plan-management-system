#!/bin/bash
docker exec -i plan-management-system-db-1 psql -U plan_user -d plan_management -c '\dt'
