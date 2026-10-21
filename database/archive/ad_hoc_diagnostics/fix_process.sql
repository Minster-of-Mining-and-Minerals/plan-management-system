UPDATE plan_versions SET process_started_at = created_at WHERE process_started_at IS NULL;
