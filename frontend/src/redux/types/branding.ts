export interface BrandingSettings {
  branding_setting_id: string;
  government_structure_id?: string | null;
  system_name_full: string;
  system_name_short: string;
  system_tagline?: string | null;
  logo_primary_path?: string | null;
  logo_secondary_path?: string | null;
  favicon_path?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  success_color: string;
  warning_color: string;
  error_color: string;
  info_color: string;
  background_color: string;
  surface_color: string;
  sidebar_color: string;
  header_color: string;
  text_primary_color: string;
  text_secondary_color: string;
  border_color: string;
  updated_at?: string;
}

export type UpdateBrandingSettingsPayload = Partial<
  Omit<BrandingSettings, "branding_setting_id" | "updated_at">
>;

export interface BrandingPublicResponse extends BrandingSettings {
  css_variables: Record<string, string>;
}
