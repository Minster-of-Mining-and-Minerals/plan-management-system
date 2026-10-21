SELECT v.version_kind, COUNT(n.plan_node_id) FROM plan_versions v LEFT JOIN plan_nodes n ON v.plan_version_id = n.plan_version_id GROUP BY v.version_kind;
