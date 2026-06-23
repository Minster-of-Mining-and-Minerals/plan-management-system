import type { BrandingSettings } from "@/redux/types/branding";

export function hexToHslComponents(hex: string): string {
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

export function brandingToCssVariables(
  branding: BrandingSettings
): Record<string, string> {
  return {
    "--primary": hexToHslComponents(branding.primary_color),
    "--primary-foreground": "0 0% 100%",
    "--secondary": hexToHslComponents(branding.secondary_color),
    "--secondary-foreground": hexToHslComponents(branding.text_primary_color),
    "--accent": hexToHslComponents(branding.accent_color),
    "--accent-foreground": hexToHslComponents(branding.text_primary_color),
    "--destructive": hexToHslComponents(branding.error_color),
    "--destructive-foreground": "0 0% 100%",
    "--background": hexToHslComponents(branding.background_color),
    "--foreground": hexToHslComponents(branding.text_primary_color),
    "--card": hexToHslComponents(branding.surface_color),
    "--card-foreground": hexToHslComponents(branding.text_primary_color),
    "--muted": hexToHslComponents(branding.surface_color),
    "--muted-foreground": hexToHslComponents(branding.text_secondary_color),
    "--border": hexToHslComponents(branding.border_color),
    "--input": hexToHslComponents(branding.border_color),
    "--ring": hexToHslComponents(branding.accent_color),
    "--sidebar-background": hexToHslComponents(branding.sidebar_color),
    "--sidebar-foreground": hexToHslComponents(branding.text_primary_color),
    "--sidebar-primary": hexToHslComponents(branding.primary_color),
    "--sidebar-primary-foreground": "0 0% 100%",
    "--sidebar-accent": hexToHslComponents(branding.surface_color),
    "--sidebar-accent-foreground": hexToHslComponents(branding.text_primary_color),
    "--sidebar-border": hexToHslComponents(branding.border_color),
    "--sidebar-ring": hexToHslComponents(branding.primary_color),
    "--header-background": hexToHslComponents(branding.header_color),
    "--success": hexToHslComponents(branding.success_color),
    "--warning": hexToHslComponents(branding.warning_color),
    "--info": hexToHslComponents(branding.info_color),
    "--sidebar-nav-hover": hexToHslComponents(branding.sidebar_nav_hover_color),
    "--sidebar-nav-active": hexToHslComponents(branding.sidebar_nav_active_color),
    "--sidebar-nav-active-foreground": hexToHslComponents(
      branding.sidebar_nav_active_text_color
    ),
    "--sidebar-subnav-active": hexToHslComponents(branding.sidebar_subnav_active_color),
    "--sidebar-subnav-active-foreground": hexToHslComponents(
      branding.sidebar_subnav_active_text_color
    ),
    "--sidebar-header-text": hexToHslComponents(branding.sidebar_header_text_color),
    "--toolbar-button": hexToHslComponents(branding.toolbar_button_color),
    "--toolbar-button-hover": hexToHslComponents(branding.toolbar_button_hover_color),
    "--toolbar-button-foreground": hexToHslComponents(branding.toolbar_button_text_color),
    "--table-header": hexToHslComponents(branding.table_header_color),
    "--table-header-hover": hexToHslComponents(branding.table_header_hover_color),
    "--table-header-foreground": hexToHslComponents(branding.table_header_text_color),
    "--golden-dark": hexToHslComponents(branding.toolbar_button_color),
    "--golden-metallic": hexToHslComponents(branding.sidebar_nav_hover_color),
    "--golden-dark-hover": hexToHslComponents(branding.toolbar_button_hover_color),
  };
}

export function applyBrandingTheme(
  branding: BrandingSettings,
  cssVariables?: Record<string, string>
): void {
  if (typeof document === "undefined") return;

  const vars = cssVariables ?? brandingToCssVariables(branding);
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function resolveBrandingAssetUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;

  const base = process.env.NEXT_PUBLIC_FILE_URL || "http://localhost:4000";
  return `${base}/${path.replace(/\\/g, "/")}`;
}

export function applyBrandingDocumentMeta(branding: BrandingSettings): void {
  if (typeof document === "undefined") return;

  document.title = branding.system_name_full;

  const faviconHref = resolveBrandingAssetUrl(branding.favicon_path);
  if (!faviconHref) return;

  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = faviconHref;
}
