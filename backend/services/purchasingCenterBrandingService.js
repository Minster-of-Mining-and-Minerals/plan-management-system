"use strict";

const { PurchasingCenter, PurchasingCenterBrandingSetting } = require("../models");
const { DEFAULT_BRANDING } = require("./brandingService");

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
  "sidebar_nav_hover_color",
  "sidebar_nav_active_color",
  "sidebar_nav_active_text_color",
  "sidebar_subnav_active_color",
  "sidebar_subnav_active_text_color",
  "sidebar_header_text_color",
  "toolbar_button_color",
  "toolbar_button_hover_color",
  "toolbar_button_text_color",
  "table_header_color",
  "table_header_hover_color",
  "table_header_text_color",
];

function hexToHslComponents(hex) {
  if (!hex || typeof hex !== "string") return "0 0% 0%";
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

function brandingToCssVariables(b) {
  const brand = { ...DEFAULT_BRANDING, ...(b || {}) };
  return {
    "--primary": hexToHslComponents(brand.primary_color),
    "--primary-foreground": "0 0% 100%",
    "--secondary": hexToHslComponents(brand.secondary_color),
    "--secondary-foreground": hexToHslComponents(brand.text_primary_color),
    "--accent": hexToHslComponents(brand.accent_color),
    "--accent-foreground": hexToHslComponents(brand.text_primary_color),
    "--destructive": hexToHslComponents(brand.error_color),
    "--destructive-foreground": "0 0% 100%",
    "--background": hexToHslComponents(brand.background_color),
    "--foreground": hexToHslComponents(brand.text_primary_color),
    "--card": hexToHslComponents(brand.surface_color),
    "--card-foreground": hexToHslComponents(brand.text_primary_color),
    "--popover": hexToHslComponents(brand.surface_color),
    "--popover-foreground": hexToHslComponents(brand.text_primary_color),
    "--muted": hexToHslComponents(brand.surface_color),
    "--muted-foreground": hexToHslComponents(brand.text_secondary_color),
    "--border": hexToHslComponents(brand.border_color),
    "--input": hexToHslComponents(brand.border_color),
    "--ring": hexToHslComponents(brand.accent_color || brand.primary_color),
    "--sidebar-background": hexToHslComponents(brand.sidebar_color),
    "--sidebar-foreground": hexToHslComponents(brand.text_primary_color),
    "--sidebar-primary": hexToHslComponents(brand.primary_color),
    "--sidebar-primary-foreground": "0 0% 100%",
    "--sidebar-accent": hexToHslComponents(brand.surface_color),
    "--sidebar-accent-foreground": hexToHslComponents(brand.text_primary_color),
    "--sidebar-border": hexToHslComponents(brand.border_color),
    "--sidebar-ring": hexToHslComponents(brand.primary_color),
    "--header-background": hexToHslComponents(brand.header_color),
    "--header-foreground": hexToHslComponents(brand.text_primary_color),
    "--success": hexToHslComponents(brand.success_color),
    "--warning": hexToHslComponents(brand.warning_color),
    "--info": hexToHslComponents(brand.info_color),
    "--sidebar-nav-hover": hexToHslComponents(brand.sidebar_nav_hover_color),
    "--sidebar-nav-active": hexToHslComponents(brand.sidebar_nav_active_color),
    "--sidebar-nav-active-foreground": hexToHslComponents(
      brand.sidebar_nav_active_text_color
    ),
    "--sidebar-subnav-active": hexToHslComponents(brand.sidebar_subnav_active_color),
    "--sidebar-subnav-active-foreground": hexToHslComponents(
      brand.sidebar_subnav_active_text_color
    ),
    "--sidebar-header-text": hexToHslComponents(brand.sidebar_header_text_color),
    "--toolbar-button": hexToHslComponents(brand.toolbar_button_color),
    "--toolbar-button-hover": hexToHslComponents(brand.toolbar_button_hover_color),
    "--toolbar-button-foreground": hexToHslComponents(brand.toolbar_button_text_color),
    "--table-header": hexToHslComponents(brand.table_header_color),
    "--table-header-hover": hexToHslComponents(brand.table_header_hover_color),
    "--table-header-foreground": hexToHslComponents(brand.table_header_text_color),
    "--golden-dark": hexToHslComponents(brand.toolbar_button_color),
    "--golden-metallic": hexToHslComponents(brand.sidebar_nav_hover_color),
    "--golden-dark-hover": hexToHslComponents(brand.toolbar_button_hover_color),
  };
}

async function resolveEffectivePurchasingCenterBranding(purchasingCenterId) {
  if (!purchasingCenterId) {
    const cssVars = brandingToCssVariables(DEFAULT_BRANDING);
    return {
      ...DEFAULT_BRANDING,
      css_variables: cssVars,
      cssVariables: cssVars,
      is_using_default: true,
      scope: "global",
    };
  }

  const center = await PurchasingCenter.findByPk(purchasingCenterId, {
    include: [
      {
        model: PurchasingCenterBrandingSetting,
        as: "branding",
      },
    ],
  });

  if (!center) {
    const cssVars = brandingToCssVariables(DEFAULT_BRANDING);
    return {
      ...DEFAULT_BRANDING,
      css_variables: cssVars,
      cssVariables: cssVars,
      is_using_default: true,
      scope: "global",
    };
  }

  const hasCustomBranding = Boolean(center.branding);
  const b = center.branding?.toJSON ? center.branding.toJSON() : (center.branding || {});

  const effective = {
    ...DEFAULT_BRANDING,
    purchasing_center_id: center.purchasing_center_id,
    purchasing_center_name: center.name,
    purchasing_center_code: center.code,
    system_name_full: b.system_name_full || `${center.name} Purchasing Center`,
    system_name_short: b.system_name_short || `${center.code} PC`,
    system_tagline: b.system_tagline || `${center.name} Purchasing & Procurement Workspace`,
    logo_primary_path: b.logo_primary_path || center.logo_path || DEFAULT_BRANDING.logo_primary_path,
    logo_secondary_path: b.logo_secondary_path || center.logo_path || DEFAULT_BRANDING.logo_secondary_path,
    logo_dark_path: b.logo_dark_path || null,
    favicon_path: b.favicon_path || DEFAULT_BRANDING.favicon_path,
    theme_preference: b.theme_preference || "system",
    is_using_default: !hasCustomBranding,
    scope: "purchasing_center",
  };

  for (const field of COLOR_FIELDS) {
    if (b[field]) {
      effective[field] = b[field];
    }
  }

  const cssVars = brandingToCssVariables(effective);
  effective.css_variables = cssVars;
  effective.cssVariables = cssVars;
  return effective;
}

async function updatePurchasingCenterBranding(purchasingCenterId, brandingData) {
  const center = await PurchasingCenter.findByPk(purchasingCenterId);
  if (!center) {
    const error = new Error("Purchasing Center not found.");
    error.status = 404;
    throw error;
  }

  let record = await PurchasingCenterBrandingSetting.findOne({
    where: { purchasing_center_id: purchasingCenterId },
  });

  const payload = {};
  const allowed = [
    "system_name_full",
    "system_name_short",
    "system_tagline",
    "logo_primary_path",
    "logo_secondary_path",
    "logo_dark_path",
    "favicon_path",
    "theme_preference",
    ...COLOR_FIELDS,
  ];

  for (const field of allowed) {
    if (brandingData[field] !== undefined) {
      payload[field] = brandingData[field];
    }
  }

  if (record) {
    await record.update(payload);
  } else {
    record = await PurchasingCenterBrandingSetting.create({
      purchasing_center_id: purchasingCenterId,
      ...payload,
    });
  }

  return resolveEffectivePurchasingCenterBranding(purchasingCenterId);
}

module.exports = {
  resolveEffectivePurchasingCenterBranding,
  resolveEffectiveBranding: resolveEffectivePurchasingCenterBranding,
  updatePurchasingCenterBranding,
  updateBranding: updatePurchasingCenterBranding,
  brandingToCssVariables,
  hexToHslComponents,
};
