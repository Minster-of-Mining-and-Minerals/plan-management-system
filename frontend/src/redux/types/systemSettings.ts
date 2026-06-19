export interface SystemSettings {
  system_setting_id: string;
  expose_required_permissions: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateSystemSettingsPayload {
  expose_required_permissions: boolean;
}
