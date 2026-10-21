SELECT plan_version_id, version_kind, review_snapshot_of_version_id, execution_snapshot_of_version_id FROM plan_versions WHERE version_kind = 'master' LIMIT 10;
