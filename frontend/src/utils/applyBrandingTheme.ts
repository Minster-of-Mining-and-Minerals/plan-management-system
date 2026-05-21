import type { SystemBranding } from "@/redux/types/branding";
import {
  DEFAULT_BRANDING_THEME,
  themeFromBrandingRecord,
} from "@/config/brandingTheme";

export const DEFAULT_BRANDING: SystemBranding = {
  branding_id: "default",
  system_name: "Postgress Express Node Next full stack template",
  system_name_am:
    "ፖስትግሬስ፣ ኤክስፕሬስ፣ ኖድ እና ኔክስት የተጠቀመ ሙሉ የዌብ ልማት መነሻ አብነት።",
  tagline: "Land Authority Management System",
  logo_url: "/logo-only.png",
  logo_login_url: "/logo-mom.png",
  primary_hsl: DEFAULT_BRANDING_THEME.primary,
  accent_hsl: DEFAULT_BRANDING_THEME["section-accent"],
  sidebar_hover_hsl: DEFAULT_BRANDING_THEME["sidebar-hover"],
  accent_hover_hsl: DEFAULT_BRANDING_THEME["section-accent-hover"],
  theme_json: DEFAULT_BRANDING_THEME,
  is_active: true,
};

export function applyBrandingTheme(branding: SystemBranding) {
  if (typeof document === "undefined") return;

  const theme = themeFromBrandingRecord(branding);
  const root = document.documentElement;

  Object.entries(theme).forEach(([key, value]) => {
    if (value) {
      root.style.setProperty(`--${key}`, value);
    }
  });

  if (branding.system_name) {
    document.title = branding.system_name;
  }
}

export function resolveBranding(
  branding?: SystemBranding | null
): SystemBranding {
  if (!branding) return DEFAULT_BRANDING;
  const theme_json = themeFromBrandingRecord(branding);
  const legacy = {
    primary_hsl: theme_json.primary,
    accent_hsl: theme_json["section-accent"],
    sidebar_hover_hsl: theme_json["sidebar-hover"],
    accent_hover_hsl: theme_json["section-accent-hover"],
  };
  return {
    ...branding,
    ...legacy,
    theme_json,
  };
}
