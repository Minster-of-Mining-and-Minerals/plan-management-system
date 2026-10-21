SELECT count(*) FROM internal_assignments a JOIN plan_nodes n ON a.plan_node_id = n.plan_node_id WHERE n.plan_version_id = '20000000-0000-4000-8000-000000000401';
