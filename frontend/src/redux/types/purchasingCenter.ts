export interface PurchasingCenterBrandingData {
  branding_id?: string;
  purchasing_center_id: string;
  system_name_full: string;
  system_name_short: string;
  system_tagline?: string | null;
  logo_primary_path?: string | null;
  logo_secondary_path?: string | null;
  favicon_path?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  success_color?: string;
  warning_color?: string;
  error_color?: string;
  info_color?: string;
  background_color?: string;
  surface_color?: string;
  sidebar_color?: string;
  header_color?: string;
  text_primary_color?: string;
  text_secondary_color?: string;
  border_color?: string;
  sidebar_nav_hover_color?: string;
  sidebar_nav_active_color?: string;
  sidebar_nav_active_text_color?: string;
  sidebar_subnav_active_color?: string;
  sidebar_subnav_active_text_color?: string;
  sidebar_header_text_color?: string;
  toolbar_button_color?: string;
  toolbar_button_hover_color?: string;
  toolbar_button_text_color?: string;
  table_header_color?: string;
  table_header_hover_color?: string;
  table_header_text_color?: string;
  css_variables?: Record<string, string>;
  is_using_default?: boolean;
  scope?: "purchasing_center" | "global";
  purchasing_center_name?: string;
  purchasing_center_code?: string;
}

export interface PurchasingCenter {
  purchasing_center_id: string;
  name: string;
  code: string;
  description?: string | null;
  logo_path?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  branding?: PurchasingCenterBrandingData | null;
  active_users_count?: number;
}

export interface CreatePurchasingCenterPayload {
  name: string;
  code: string;
  description?: string;
  logo_path?: string;
}

export interface UpdatePurchasingCenterPayload {
  name?: string;
  code?: string;
  description?: string;
  logo_path?: string;
  is_active?: boolean;
}

export interface PurchasingCenterDashboardData {
  purchasing_center: {
    purchasing_center_id: string;
    name: string;
    code: string;
    description?: string | null;
    is_active: boolean;
    created_at: string;
  };
  branding: PurchasingCenterBrandingData | null;
  counts: {
    users: {
      total: number;
      active: number;
      inactive: number;
    };
    departments: 0; // Invariant: Purchasing centers have no departments
  };
  recent_users: Array<{
    user_id: string;
    full_name: string;
    email: string;
    phone_number?: string | null;
    is_active: boolean;
    created_at: string;
    roles?: Array<{ role_id: string; name: string; scope: string }>;
  }>;
}
