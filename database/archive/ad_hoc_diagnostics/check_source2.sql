SELECT COUNT(*) FROM plan_nodes n JOIN plan_versions v ON n.plan_version_id = v.plan_version_id WHERE v.version_kind = 'annual' AND n.source_plan_node_id IS NOT NULL;
