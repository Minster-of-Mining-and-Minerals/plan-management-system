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

export interface BrandingSettingsMeta {
  scope: "global" | "sector";
  government_structure_id: string | null;
  is_using_default: boolean;
  resolved_from_structure_id: string | null;
  override: BrandingSettings | null;
  global: BrandingSettings;
}

export type UpdateBrandingSettingsPayload = Partial<
  Omit<BrandingSettings, "branding_setting_id" | "updated_at">
> & {
  government_structure_id?: string | null;
};

export type BrandingScopeQuery = {
  government_structure_id?: string;
};

const UPDATABLE_BRANDING_KEYS = [
  "system_name_full",
  "system_name_short",
  "system_tagline",
  "logo_primary_path",
  "logo_secondary_path",
  "favicon_path",
  "primary_color",
  "secondary_color",
  "accent_color",
  "success_color",
  "warning_color",
  "error_color",
  "info_color",
  "background_color",
  "surface_color",
  "sidebar_color",
  "header_color",
  "text_primary_color",
  "text_secondary_color",
  "border_color",
] as const satisfies ReadonlyArray<keyof UpdateBrandingSettingsPayload>;

export function toUpdateBrandingPayload(
  settings: BrandingSettings
): Omit<UpdateBrandingSettingsPayload, "government_structure_id"> {
  const payload: Omit<UpdateBrandingSettingsPayload, "government_structure_id"> = {};
  for (const key of UPDATABLE_BRANDING_KEYS) {
    const value = settings[key];
    payload[key] = value ?? undefined;
  }
  return payload;
}

export interface BrandingPublicResponse extends BrandingSettings {
  css_variables: Record<string, string>;
  resolved_from_structure_id?: string | null;
  is_using_default?: boolean;
  meta?: BrandingSettingsMeta;
}
