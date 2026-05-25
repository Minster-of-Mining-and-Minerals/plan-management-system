import type { HslFormat } from "@/utils/brandingColorFormat";

export type BrandingThemeTokens = Record<string, string>;

export interface BrandingColorFieldDef {
  key: string;
  label: string;
  description?: string;
  format: HslFormat;
  preserveAlpha?: boolean;
  placeholder?: string;
}

export interface BrandingColorCategory {
  id: string;
  title: string;
  description: string;
  fields: BrandingColorFieldDef[];
}

/** Maps deprecated color-named keys to section/layout tokens. */
export const LEGACY_THEME_KEY_MAP: Record<string, string> = {
  "golden-dark": "section-accent",
  "golden-metallic": "sidebar-hover",
  "golden-soft": "header-surface",
  "golden-classic": "section-emphasis",
  "golden-dark-hover": "section-accent-hover",
  "golden-dark-light": "section-accent-muted",
  "golden-dark-10": "section-accent-subtle-10",
  "golden-dark-20": "section-accent-subtle-20",
  "golden-dark-30": "section-accent-subtle-30",
  "golden-dark-40": "section-accent-subtle-40",
  "golden-dark-50": "section-accent-subtle-50",
  "golden-dark-60": "section-accent-subtle-60",
  "golden-dark-70": "section-accent-subtle-70",
  "golden-dark-80": "section-accent-subtle-80",
  "golden-dark-90": "section-accent-subtle-90",
};

/**
 * Logo-driven palette (nova-cure-logo.png):
 * Blue left N / network | Teal right N / tagline | Dark navy field | White pulse & wordmark
 */
export const DEFAULT_BRANDING_THEME: BrandingThemeTokens = {
  background: "204 45% 98%",
  foreground: "220 49% 8%",
  card: "0 0% 100%",
  "card-foreground": "220 49% 8%",
  popover: "0 0% 100%",
  "popover-foreground": "220 49% 8%",
  primary: "216 100% 53%",
  "primary-foreground": "0 0% 100%",
  secondary: "172 55% 92%",
  "secondary-foreground": "172 100% 28%",
  muted: "216 40% 94%",
  "muted-foreground": "220 30% 38%",
  accent: "216 80% 96%",
  "accent-foreground": "216 100% 42%",
  destructive: "0 84.2% 60.2%",
  "destructive-foreground": "0 0% 98%",
  border: "216 28% 88%",
  input: "216 28% 88%",
  ring: "216 100% 53%",
  "sidebar-background": "0 0% 100%",
  "sidebar-foreground": "220 49% 8%",
  "sidebar-primary": "216 100% 53%",
  "sidebar-primary-foreground": "0 0% 100%",
  "sidebar-accent": "216 100% 96%",
  "sidebar-accent-foreground": "216 100% 40%",
  "sidebar-border": "216 25% 88%",
  "sidebar-ring": "216 100% 53%",
  "section-accent": "216, 100%, 53%",
  "sidebar-hover": "172, 100%, 38%, 14%",
  "header-surface": "172, 100%, 38%",
  "section-emphasis": "172, 100%, 38%",
  "section-accent-hover": "216, 100%, 53%, 88%",
  "section-accent-muted": "172, 100%, 38%, 45%",
  "section-accent-subtle-10": "216, 100%, 53%, 6%",
  "section-accent-subtle-20": "216, 100%, 53%, 18%",
  "section-accent-subtle-30": "172, 100%, 38%, 22%",
  "section-accent-subtle-40": "216, 100%, 53%, 32%",
  "section-accent-subtle-50": "172, 100%, 38%, 38%",
  "section-accent-subtle-60": "216, 100%, 53%, 48%",
  "section-accent-subtle-70": "172, 100%, 38%, 55%",
  "section-accent-subtle-80": "216, 100%, 53%, 65%",
  "section-accent-subtle-90": "172, 100%, 38%, 72%",
  "auth-background": "220 49% 8%",
  "auth-panel-border": "220 38% 20%",
  "table-stripe": "216 45% 96%",
};

export const BRANDING_COLOR_CATEGORIES: BrandingColorCategory[] = [
  {
    id: "text-surfaces",
    title: "Text & Surfaces",
    description: "Page background, body text, cards, and muted text.",
    fields: [
      { key: "background", label: "Page Background", format: "space", placeholder: "204 45% 98%" },
      { key: "foreground", label: "Body Text (Dark)", format: "space", placeholder: "220 49% 8%" },
      { key: "card", label: "Card Background", format: "space" },
      { key: "card-foreground", label: "Card Text", format: "space" },
      { key: "muted", label: "Muted Background", format: "space" },
      { key: "muted-foreground", label: "Muted Text", format: "space" },
    ],
  },
  {
    id: "primary-actions",
    title: "Primary & Actions",
    description: "Main brand color for headings, links, and primary buttons.",
    fields: [
      { key: "primary", label: "Primary Brand (#0F6FFF)", format: "space", placeholder: "216 100% 53%" },
      { key: "primary-foreground", label: "Text on Primary", format: "space", placeholder: "0 0% 100%" },
      { key: "ring", label: "Focus Ring", format: "space" },
      { key: "border", label: "Borders", format: "space" },
      { key: "input", label: "Input Borders", format: "space" },
    ],
  },
  {
    id: "section-accents",
    title: "Section Accents",
    description: "Shared accent used on auth screens, headers, and action areas.",
    fields: [
      { key: "section-accent", label: "Primary blue (logo N left)", format: "comma", placeholder: "216, 100%, 53%" },
      { key: "section-accent-hover", label: "Primary hover glow", format: "comma", preserveAlpha: true, placeholder: "216, 100%, 53%, 88%" },
      { key: "section-emphasis", label: "Teal (logo N right)", format: "comma", placeholder: "172, 100%, 38%" },
      { key: "section-accent-muted", label: "Teal muted overlay", format: "comma", preserveAlpha: true, placeholder: "172, 100%, 38%, 45%" },
    ],
  },
  {
    id: "sidebar",
    title: "Admin Sidebar",
    description: "Sidebar background, text, hover, and active states.",
    fields: [
      { key: "sidebar-background", label: "Sidebar Background", format: "space" },
      { key: "sidebar-foreground", label: "Sidebar Text", format: "space" },
      { key: "sidebar-primary", label: "Sidebar Primary", format: "space" },
      { key: "sidebar-accent", label: "Sidebar Active Background", format: "space" },
      { key: "sidebar-hover", label: "Sidebar Hover Background", format: "comma", preserveAlpha: true, placeholder: "172, 100%, 38%, 12%" },
      { key: "sidebar-border", label: "Sidebar Border", format: "space" },
    ],
  },
  {
    id: "header-public",
    title: "Public Header",
    description: "Top navigation bar and marketing header surfaces.",
    fields: [
      { key: "header-surface", label: "Header Surface", format: "comma", placeholder: "172, 100%, 38%" },
    ],
  },
  {
    id: "auth-layout",
    title: "Auth & Login Layout",
    description: "Login, forgot password, and change password screens.",
    fields: [
      { key: "auth-background", label: "Auth Page Background", format: "space", placeholder: "204 45% 98%" },
      { key: "auth-panel-border", label: "Auth Panel Border", format: "space", placeholder: "204 30% 88%" },
    ],
  },
  {
    id: "tables-misc",
    title: "Tables & Feedback",
    description: "Table stripes, destructive actions, and secondary surfaces.",
    fields: [
      { key: "table-stripe", label: "Table Row Stripe", format: "space", placeholder: "204 40% 96%" },
      { key: "secondary", label: "Secondary Background", format: "space" },
      { key: "secondary-foreground", label: "Secondary Text", format: "space" },
      { key: "destructive", label: "Destructive", format: "space" },
      { key: "destructive-foreground", label: "Destructive Text", format: "space" },
    ],
  },
];

export function normalizeThemeKeys(
  theme?: BrandingThemeTokens | null
): BrandingThemeTokens {
  if (!theme) return {};

  const normalized: BrandingThemeTokens = { ...theme };

  for (const [legacyKey, newKey] of Object.entries(LEGACY_THEME_KEY_MAP)) {
    if (normalized[legacyKey] !== undefined) {
      if (normalized[newKey] === undefined) {
        normalized[newKey] = normalized[legacyKey];
      }
      delete normalized[legacyKey];
    }
  }

  return normalized;
}

export function mergeBrandingTheme(
  partial?: BrandingThemeTokens | null
): BrandingThemeTokens {
  return { ...DEFAULT_BRANDING_THEME, ...normalizeThemeKeys(partial) };
}

/** Map API record (legacy DB columns + theme_json) to full theme. */
export function themeFromBrandingRecord(record: {
  theme_json?: BrandingThemeTokens | null;
  primary_hsl?: string;
  accent_hsl?: string;
  sidebar_hover_hsl?: string;
  accent_hover_hsl?: string;
  /** @deprecated legacy column names */
  golden_dark_hsl?: string;
  golden_metallic_hsl?: string;
  golden_dark_hover_hsl?: string;
}): BrandingThemeTokens {
  const legacy: BrandingThemeTokens = {};

  if (record.primary_hsl) legacy.primary = record.primary_hsl;

  const accent =
    record.accent_hsl ?? record.golden_dark_hsl;
  const sidebarHover =
    record.sidebar_hover_hsl ?? record.golden_metallic_hsl;
  const accentHover =
    record.accent_hover_hsl ?? record.golden_dark_hover_hsl;

  if (accent) legacy["section-accent"] = accent;
  if (sidebarHover) legacy["sidebar-hover"] = sidebarHover;
  if (accentHover) legacy["section-accent-hover"] = accentHover;

  const themeJson =
    typeof record.theme_json === "string"
      ? (JSON.parse(record.theme_json) as BrandingThemeTokens)
      : record.theme_json;

  return mergeBrandingTheme({
    ...legacy,
    ...(themeJson ?? {}),
  });
}

export function legacyFieldsFromTheme(theme: BrandingThemeTokens) {
  return {
    primary_hsl: theme.primary ?? DEFAULT_BRANDING_THEME.primary,
    accent_hsl: theme["section-accent"] ?? DEFAULT_BRANDING_THEME["section-accent"],
    sidebar_hover_hsl:
      theme["sidebar-hover"] ?? DEFAULT_BRANDING_THEME["sidebar-hover"],
    accent_hover_hsl:
      theme["section-accent-hover"] ?? DEFAULT_BRANDING_THEME["section-accent-hover"],
  };
}
