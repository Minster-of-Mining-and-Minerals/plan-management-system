export interface CompanyBrandingData {
  branding_id?: string;
  company_id: string;
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
  scope?: "company" | "global";
  company_name?: string;
  company_code?: string;
}

export interface Company {
  company_id: string;
  name: string;
  code: string;
  description?: string | null;
  logo_path?: string | null;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  branding?: CompanyBrandingData | null;
  structures_count?: number;
  active_users_count?: number;
}

export interface CompanyStructure {
  company_structure_id: string;
  company_id: string;
  parent_id?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent?: { company_structure_id: string; name: string; level?: number } | null;
  children?: CompanyStructure[];
  users?: Array<{
    user_id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    is_active: boolean;
  }>;
  users_count?: number;
}

export interface CreateCompanyPayload {
  name: string;
  code: string;
  description?: string;
  logo_path?: string;
  email?: string;
  phone_number?: string;
  address?: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  code?: string;
  description?: string;
  logo_path?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  is_active?: boolean;
}

export interface CreateCompanyStructurePayload {
  company_id: string;
  name: string;
  code?: string;
  description?: string;
  parent_id?: string | null;
}

export interface UpdateCompanyStructurePayload {
  name?: string;
  code?: string;
  description?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

export interface CompanyDashboardData {
  company: {
    company_id: string;
    name: string;
    code: string;
    description?: string | null;
    email?: string | null;
    phone_number?: string | null;
    address?: string | null;
    is_active: boolean;
    created_at: string;
  };
  branding: CompanyBrandingData;
  counts: {
    departments: {
      total: number;
      root: number;
      active: number;
    };
    users: {
      total: number;
      active: number;
      assigned: number;
      unassigned: number;
    };
  };
  recent_departments: Array<{
    company_structure_id: string;
    name: string;
    code?: string | null;
    level: number;
    is_active: boolean;
    created_at: string;
  }>;
  recent_users: Array<{
    user_id: string;
    full_name: string;
    email: string;
    is_active: boolean;
    created_at: string;
    roles?: Array<{ role_id: string; name: string; scope: string }>;
    company_structure?: { company_structure_id: string; name: string } | null;
    companyStructure?: { company_structure_id: string; name: string } | null;
  }>;
}
