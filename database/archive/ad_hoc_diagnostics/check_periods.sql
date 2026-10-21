SELECT parent_plan_version_id, COUNT(*) FROM plan_versions WHERE version_kind = 'execution_period' GROUP BY parent_plan_version_id;
