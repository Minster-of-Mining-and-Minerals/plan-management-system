SELECT parent_plan_version_id, COUNT(*) FROM plan_versions WHERE version_kind = 'annual' GROUP BY parent_plan_version_id;
