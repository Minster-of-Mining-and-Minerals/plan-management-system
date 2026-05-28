import type { BrandingThemeTokens } from "@/config/brandingTheme";

export type { BrandingThemeTokens };

export interface SystemBranding {
  branding_id: string;
  system_name: string;
  system_name_am?: string | null;
  tagline?: string | null;
  logo_url: string;
  logo_login_url: string;
  primary_hsl: string;
  accent_hsl: string;
  sidebar_hover_hsl: string;
  accent_hover_hsl: string;
  theme_json?: BrandingThemeTokens | null;
  organization_address?: string | null;
  organization_city?: string | null;
  organization_region?: string | null;
  organization_country?: string | null;
  organization_branch?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  license_info?: string | null;
  prescription_signature_file?: string | null;
  prescription_config?: Record<string, unknown> | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBrandingPayload {
  system_name: string;
  system_name_am?: string;
  tagline?: string;
  logo_url: string;
  logo_login_url: string;
  theme_json: BrandingThemeTokens;
  is_active?: boolean;
}

export type UpdateBrandingPayload = Partial<CreateBrandingPayload>;
