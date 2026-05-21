/** Default theme tokens — keep in sync with frontend/src/config/brandingTheme.ts */

const LEGACY_THEME_KEY_MAP = {
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

const DEFAULT_BRANDING_THEME = {
  background: "0 0% 100%",
  foreground: "0 0% 3.9%",
  card: "0 0% 100%",
  "card-foreground": "0 0% 3.9%",
  popover: "0 0% 100%",
  "popover-foreground": "0 0% 3.9%",
  primary: "201 85% 18%",
  "primary-foreground": "0 0% 100%",
  secondary: "0 0% 96.1%",
  "secondary-foreground": "0 0% 9%",
  muted: "0 0% 96.1%",
  "muted-foreground": "0 0% 45.1%",
  accent: "0 0% 96.1%",
  "accent-foreground": "0 0% 9%",
  destructive: "0 84.2% 60.2%",
  "destructive-foreground": "0 0% 98%",
  border: "0 0% 89.8%",
  input: "0 0% 89.8%",
  ring: "45 80% 40%",
  "sidebar-background": "0 0% 100%",
  "sidebar-foreground": "201 85% 18%",
  "sidebar-primary": "201 85% 18%",
  "sidebar-primary-foreground": "0 0% 100%",
  "sidebar-accent": "201 85% 95%",
  "sidebar-accent-foreground": "201 85% 18%",
  "sidebar-border": "0 0% 89.8%",
  "sidebar-ring": "201 85% 18%",
  "section-accent": "45, 80%, 40%",
  "sidebar-hover": "43, 85%, 55%, 10%",
  "header-surface": "42, 90%, 60%",
  "section-emphasis": "45, 100%, 50%",
  "section-accent-hover": "45, 80%, 40%, 90%",
  "section-accent-muted": "45, 80%, 40%, 50%",
  "section-accent-subtle-10": "45, 80%, 40%, 5%",
  "section-accent-subtle-20": "45, 80%, 40%, 20%",
  "section-accent-subtle-30": "45, 80%, 40%, 30%",
  "section-accent-subtle-40": "45, 80%, 40%, 40%",
  "section-accent-subtle-50": "45, 80%, 40%, 50%",
  "section-accent-subtle-60": "45, 80%, 40%, 60%",
  "section-accent-subtle-70": "45, 80%, 40%, 70%",
  "section-accent-subtle-80": "45, 80%, 40%, 80%",
  "section-accent-subtle-90": "45, 80%, 40%, 90%",
  "auth-background": "210 40% 98%",
  "auth-panel-border": "210 30% 88%",
  "table-stripe": "220 60% 98%",
};

function normalizeThemeKeys(theme) {
  if (!theme) return {};
  const normalized = { ...theme };
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

function mergeBrandingTheme(partial = {}) {
  return { ...DEFAULT_BRANDING_THEME, ...normalizeThemeKeys(partial) };
}

function themeFromRecord(record) {
  const legacy = {};
  if (record.primary_hsl) legacy.primary = record.primary_hsl;

  const accent = record.accent_hsl ?? record.golden_dark_hsl;
  const sidebarHover = record.sidebar_hover_hsl ?? record.golden_metallic_hsl;
  const accentHover = record.accent_hover_hsl ?? record.golden_dark_hover_hsl;

  if (accent) legacy["section-accent"] = accent;
  if (sidebarHover) legacy["sidebar-hover"] = sidebarHover;
  if (accentHover) legacy["section-accent-hover"] = accentHover;

  const themeJson =
    typeof record.theme_json === "string"
      ? JSON.parse(record.theme_json)
      : record.theme_json;

  return mergeBrandingTheme({ ...legacy, ...(themeJson || {}) });
}

function legacyFieldsFromTheme(theme) {
  return {
    primary_hsl: theme.primary,
    accent_hsl: theme["section-accent"],
    sidebar_hover_hsl: theme["sidebar-hover"],
    accent_hover_hsl: theme["section-accent-hover"],
  };
}

module.exports = {
  DEFAULT_BRANDING_THEME,
  LEGACY_THEME_KEY_MAP,
  normalizeThemeKeys,
  mergeBrandingTheme,
  themeFromRecord,
  legacyFieldsFromTheme,
};
