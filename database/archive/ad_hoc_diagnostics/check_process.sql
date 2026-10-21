SELECT count(*) FROM plan_versions WHERE version_kind = 'master' AND process_started_at IS NULL;
