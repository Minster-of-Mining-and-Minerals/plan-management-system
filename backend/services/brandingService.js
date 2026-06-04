"use strict";

const DEFAULT_BRANDING_ID = "80000000-0000-4000-8000-000000000001";

const DEFAULT_BRANDING = {
  branding_setting_id: DEFAULT_BRANDING_ID,
  government_structure_id: null,
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
};

const COLOR_FIELDS = [
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
];

const TEXT_FIELDS = ["system_name_full", "system_name_short", "system_tagline"];
const LOGO_FIELDS = ["logo_primary_path", "logo_secondary_path", "favicon_path"];

function hexToHslComponents(hex) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function pickBrandingPayload(record) {
  if (!record) return { ...DEFAULT_BRANDING };
  const plain = record.get ? record.get({ plain: true }) : record;
  return {
    branding_setting_id: plain.branding_setting_id,
    government_structure_id: plain.government_structure_id,
    system_name_full: plain.system_name_full,
    system_name_short: plain.system_name_short,
    system_tagline: plain.system_tagline,
    logo_primary_path: plain.logo_primary_path,
    logo_secondary_path: plain.logo_secondary_path,
    favicon_path: plain.favicon_path,
    primary_color: plain.primary_color,
    secondary_color: plain.secondary_color,
    accent_color: plain.accent_color,
    success_color: plain.success_color,
    warning_color: plain.warning_color,
    error_color: plain.error_color,
    info_color: plain.info_color,
    background_color: plain.background_color,
    surface_color: plain.surface_color,
    sidebar_color: plain.sidebar_color,
    header_color: plain.header_color,
    text_primary_color: plain.text_primary_color,
    text_secondary_color: plain.text_secondary_color,
    border_color: plain.border_color,
    updated_at: plain.updated_at,
  };
}

function brandingToCssVariables(branding) {
  const b = branding || DEFAULT_BRANDING;
  return {
    "--primary": hexToHslComponents(b.primary_color),
    "--primary-foreground": "0 0% 100%",
    "--secondary": hexToHslComponents(b.secondary_color),
    "--secondary-foreground": hexToHslComponents(b.text_primary_color),
    "--accent": hexToHslComponents(b.accent_color),
    "--accent-foreground": hexToHslComponents(b.text_primary_color),
    "--destructive": hexToHslComponents(b.error_color),
    "--destructive-foreground": "0 0% 100%",
    "--background": hexToHslComponents(b.background_color),
    "--foreground": hexToHslComponents(b.text_primary_color),
    "--card": hexToHslComponents(b.surface_color),
    "--card-foreground": hexToHslComponents(b.text_primary_color),
    "--muted": hexToHslComponents(b.surface_color),
    "--muted-foreground": hexToHslComponents(b.text_secondary_color),
    "--border": hexToHslComponents(b.border_color),
    "--input": hexToHslComponents(b.border_color),
    "--ring": hexToHslComponents(b.accent_color),
    "--sidebar-background": hexToHslComponents(b.sidebar_color),
    "--sidebar-foreground": hexToHslComponents(b.text_primary_color),
    "--sidebar-primary": hexToHslComponents(b.primary_color),
    "--sidebar-primary-foreground": "0 0% 100%",
    "--sidebar-accent": hexToHslComponents(b.surface_color),
    "--sidebar-accent-foreground": hexToHslComponents(b.text_primary_color),
    "--sidebar-border": hexToHslComponents(b.border_color),
    "--sidebar-ring": hexToHslComponents(b.primary_color),
    "--header-background": hexToHslComponents(b.header_color),
    "--success": hexToHslComponents(b.success_color),
    "--warning": hexToHslComponents(b.warning_color),
    "--info": hexToHslComponents(b.info_color),
    "--golden-dark": hexToHslComponents(b.accent_color),
  };
}

function validateReadableTheme(payload) {
  const required = [...COLOR_FIELDS, "system_name_full", "system_name_short"];
  for (const field of required) {
    if (!payload[field] || String(payload[field]).trim() === "") {
      return `Missing required branding field: ${field}`;
    }
  }
  for (const field of COLOR_FIELDS) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(payload[field])) {
      return `Invalid color for ${field}. Use 6-digit hex format.`;
    }
  }
  return null;
}

module.exports = {
  DEFAULT_BRANDING_ID,
  DEFAULT_BRANDING,
  COLOR_FIELDS,
  TEXT_FIELDS,
  LOGO_FIELDS,
  hexToHslComponents,
  pickBrandingPayload,
  brandingToCssVariables,
  validateReadableTheme,
};
