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
  return {
    "--primary": hexToHslComponents(b.primary_color),
    "--primary-foreground": "0 0% 100%",
    "--secondary": hexToHslComponents(b.secondary_color),
    "--secondary-foreground": hexToHslComponents(b.text_primary_color),
    "--accent": hexToHslComponents(b.accent_color),
    "--accent-foreground": "0 0% 100%",
    "--background": hexToHslComponents(b.background_color),
    "--foreground": hexToHslComponents(b.text_primary_color),
    "--card": hexToHslComponents(b.surface_color),
    "--card-foreground": hexToHslComponents(b.text_primary_color),
    "--popover": hexToHslComponents(b.surface_color),
    "--popover-foreground": hexToHslComponents(b.text_primary_color),
    "--muted": hexToHslComponents(b.surface_color),
    "--muted-foreground": hexToHslComponents(b.text_secondary_color),
    "--destructive": hexToHslComponents(b.error_color),
    "--destructive-foreground": "0 0% 100%",
    "--border": hexToHslComponents(b.border_color),
    "--input": hexToHslComponents(b.border_color),
    "--ring": hexToHslComponents(b.primary_color),
    "--sidebar-background": hexToHslComponents(b.sidebar_color),
    "--sidebar-foreground": hexToHslComponents(b.text_primary_color),
    "--sidebar-primary": hexToHslComponents(b.primary_color),
    "--sidebar-primary-foreground": "0 0% 100%",
    "--sidebar-accent": hexToHslComponents(b.surface_color),
    "--sidebar-accent-foreground": hexToHslComponents(b.text_primary_color),
    "--sidebar-border": hexToHslComponents(b.border_color),
    "--sidebar-ring": hexToHslComponents(b.primary_color),
    "--header-background": hexToHslComponents(b.header_color),
    "--header-foreground": hexToHslComponents(b.text_primary_color),
  };
}

async function resolveEffectivePurchasingCenterBranding(purchasingCenterId) {
  if (!purchasingCenterId) {
    return { ...DEFAULT_BRANDING, cssVariables: brandingToCssVariables(DEFAULT_BRANDING) };
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
    return { ...DEFAULT_BRANDING, cssVariables: brandingToCssVariables(DEFAULT_BRANDING) };
  }

  const b = center.branding?.toJSON ? center.branding.toJSON() : (center.branding || {});

  const effective = {
    purchasing_center_id: center.purchasing_center_id,
    purchasing_center_name: center.name,
    purchasing_center_code: center.code,
    system_name_full: b.system_name_full || center.name,
    system_name_short: b.system_name_short || center.code,
    system_tagline: b.system_tagline || `${center.name} Purchasing & Procurement Workspace`,
    logo_primary_path: b.logo_primary_path || center.logo_path || null,
    logo_secondary_path: b.logo_secondary_path || center.logo_path || null,
    logo_dark_path: b.logo_dark_path || null,
    favicon_path: b.favicon_path || null,
    primary_color: b.primary_color || "#1e40af",
    secondary_color: b.secondary_color || "#3b82f6",
    accent_color: b.accent_color || "#60a5fa",
    success_color: b.success_color || "#10b981",
    warning_color: b.warning_color || "#f59e0b",
    error_color: b.error_color || "#ef4444",
    info_color: b.info_color || "#3b82f6",
    background_color: b.background_color || "#f8fafc",
    surface_color: b.surface_color || "#ffffff",
    sidebar_color: b.sidebar_color || "#0f172a",
    header_color: b.header_color || "#ffffff",
    text_primary_color: b.text_primary_color || "#0f172a",
    text_secondary_color: b.text_secondary_color || "#64748b",
    border_color: b.border_color || "#e2e8f0",
    theme_preference: b.theme_preference || "system",
  };

  effective.cssVariables = brandingToCssVariables(effective);
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
