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

/** Logo-driven palette (nova-cure-logo.png): blue N | teal N | dark navy field */
const DEFAULT_BRANDING_THEME = {
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
