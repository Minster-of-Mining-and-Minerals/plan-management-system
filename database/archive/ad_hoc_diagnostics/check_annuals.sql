SELECT COUNT(*) FROM plan_versions a JOIN plan_versions m ON a.parent_plan_version_id = m.plan_version_id WHERE a.version_kind = 'annual' AND m.version_kind = 'master';
