export const DEFAULT_BRANDING = {
  branding_setting_id: "80000000-0000-4000-8000-000000000001",
  government_structure_id: null as string | null,
  system_name_full: "Ministry of Mines Plan Management System",
  system_name_short: "MoM PMS",
  system_tagline: "Strategic planning and performance management",
  logo_primary_path: "/logo-only.png",
  logo_secondary_path: "/logo-mom.png",
  favicon_path: "/favicon_io/favicon.ico",
  primary_color: "#0C4A6E",
  secondary_color: "#64748B",
  accent_color: "#CA8A04",
  success_color: "#16A34A",
  warning_color: "#D97706",
  error_color: "#DC2626",
  info_color: "#0284C7",
  background_color: "#FFFFFF",
  surface_color: "#FFFFFF",
  sidebar_color: "#FFFFFF",
  header_color: "#FFFFFF",
  text_primary_color: "#0F172A",
  text_secondary_color: "#64748B",
  border_color: "#E2E8F0",
  sidebar_nav_hover_color: "#F5E6C8",
  sidebar_nav_active_color: "#CA8A04",
  sidebar_nav_active_text_color: "#FFFFFF",
  sidebar_subnav_active_color: "#F5E6C8",
  sidebar_subnav_active_text_color: "#0C4A6E",
  sidebar_header_text_color: "#CA8A04",
  toolbar_button_color: "#CA8A04",
  toolbar_button_hover_color: "#A16207",
  toolbar_button_text_color: "#FFFFFF",
  table_header_color: "#CA8A04",
  table_header_hover_color: "#A16207",
  table_header_text_color: "#FFFFFF",
} as const;

export const BRANDING_CORE_COLOR_FIELDS = [
  { key: "primary_color", label: "Primary Color" },
  { key: "secondary_color", label: "Secondary Color" },
  { key: "accent_color", label: "Accent Color" },
  { key: "success_color", label: "Success Color" },
  { key: "warning_color", label: "Warning Color" },
  { key: "error_color", label: "Error / Danger Color" },
  { key: "info_color", label: "Info Color" },
  { key: "background_color", label: "Background Color" },
  { key: "surface_color", label: "Surface / Card Color" },
  { key: "sidebar_color", label: "Sidebar Background" },
  { key: "header_color", label: "Header / Navbar Color" },
  { key: "text_primary_color", label: "Text Primary Color" },
  { key: "text_secondary_color", label: "Text Secondary Color" },
  { key: "border_color", label: "Border Color" },
] as const;

export const BRANDING_SIDEBAR_COLOR_FIELDS = [
  { key: "sidebar_header_text_color", label: "Sidebar Header Text" },
  { key: "sidebar_nav_hover_color", label: "Sidebar Nav Hover" },
  { key: "sidebar_nav_active_color", label: "Sidebar Nav Active" },
  { key: "sidebar_nav_active_text_color", label: "Sidebar Nav Active Text" },
  { key: "sidebar_subnav_active_color", label: "Sidebar Sub-Item Active" },
  { key: "sidebar_subnav_active_text_color", label: "Sidebar Sub-Item Active Text" },
] as const;

export const BRANDING_TOOLBAR_COLOR_FIELDS = [
  { key: "toolbar_button_color", label: "Toolbar Selected Button" },
  { key: "toolbar_button_hover_color", label: "Toolbar Selected Button Hover" },
  { key: "toolbar_button_text_color", label: "Toolbar Selected Button Text" },
  { key: "table_header_color", label: "Table Header Background" },
  { key: "table_header_hover_color", label: "Table Header Hover" },
  { key: "table_header_text_color", label: "Table Header Text" },
] as const;

export const BRANDING_COLOR_FIELD_GROUPS = [
  { title: "Core Theme", fields: BRANDING_CORE_COLOR_FIELDS },
  { title: "Sidebar Navigation", fields: BRANDING_SIDEBAR_COLOR_FIELDS },
  { title: "Toolbar & Tables", fields: BRANDING_TOOLBAR_COLOR_FIELDS },
] as const;

/** @deprecated Use BRANDING_COLOR_FIELD_GROUPS for grouped rendering */
export const BRANDING_COLOR_FIELDS = [
  ...BRANDING_CORE_COLOR_FIELDS,
  ...BRANDING_SIDEBAR_COLOR_FIELDS,
  ...BRANDING_TOOLBAR_COLOR_FIELDS,
] as const;

export type BrandingColorFieldKey = (typeof BRANDING_COLOR_FIELDS)[number]["key"];
