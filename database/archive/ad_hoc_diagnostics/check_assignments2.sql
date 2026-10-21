SELECT COUNT(*) FROM internal_assignments a JOIN plan_nodes n ON a.plan_node_id = n.plan_node_id JOIN plan_versions v ON n.plan_version_id = v.plan_version_id WHERE v.version_kind = 'master';
