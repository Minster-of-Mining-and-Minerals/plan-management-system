import type { BrandingSettings } from "@/redux/types/branding";
import { DEFAULT_BRANDING } from "@/lib/branding/defaults";

export function hexToHslComponents(hex?: string | null): string {
  if (!hex || typeof hex !== "string") {
    return "0 0% 0%";
  }

  const clean = hex.trim().replace(/^#/, "");
  if (!clean) return "0 0% 0%";

  let normalized = clean;
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (normalized.length !== 6) {
    return "0 0% 0%";
  }

  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return "0 0% 0%";
  }

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
  branding?: Partial<BrandingSettings> | null
): Record<string, string> {
  const b = { ...DEFAULT_BRANDING, ...(branding || {}) };

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
    "--sidebar-nav-hover": hexToHslComponents(b.sidebar_nav_hover_color),
    "--sidebar-nav-active": hexToHslComponents(b.sidebar_nav_active_color),
    "--sidebar-nav-active-foreground": hexToHslComponents(
      b.sidebar_nav_active_text_color
    ),
    "--sidebar-subnav-active": hexToHslComponents(b.sidebar_subnav_active_color),
    "--sidebar-subnav-active-foreground": hexToHslComponents(
      b.sidebar_subnav_active_text_color
    ),
    "--sidebar-header-text": hexToHslComponents(b.sidebar_header_text_color),
    "--toolbar-button": hexToHslComponents(b.toolbar_button_color),
    "--toolbar-button-hover": hexToHslComponents(b.toolbar_button_hover_color),
    "--toolbar-button-foreground": hexToHslComponents(b.toolbar_button_text_color),
    "--table-header": hexToHslComponents(b.table_header_color),
    "--table-header-hover": hexToHslComponents(b.table_header_hover_color),
    "--table-header-foreground": hexToHslComponents(b.table_header_text_color),
    "--golden-dark": hexToHslComponents(b.toolbar_button_color),
    "--golden-metallic": hexToHslComponents(b.sidebar_nav_hover_color),
    "--golden-dark-hover": hexToHslComponents(b.toolbar_button_hover_color),
  };
}

export function applyBrandingTheme(
  branding?: Partial<BrandingSettings> | null,
  cssVariables?: Record<string, string>
): void {
  if (typeof document === "undefined") return;

  const vars = cssVariables ?? brandingToCssVariables(branding);
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, value]) => {
    if (value) {
      root.style.setProperty(key, value);
    }
  });
}

export function resolveBrandingAssetUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;

  const base = process.env.NEXT_PUBLIC_FILE_URL || "http://localhost:4000";
  return `${base}/${path.replace(/\\/g, "/")}`;
}

export function applyBrandingDocumentMeta(branding?: Partial<BrandingSettings> | null): void {
  if (typeof document === "undefined") return;

  const title = branding?.system_name_full || DEFAULT_BRANDING.system_name_full;
  if (title) {
    document.title = title;
  }

  const faviconHref = resolveBrandingAssetUrl(
    branding?.favicon_path ?? DEFAULT_BRANDING.favicon_path
  );
  if (!faviconHref) return;

  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = faviconHref;
}
