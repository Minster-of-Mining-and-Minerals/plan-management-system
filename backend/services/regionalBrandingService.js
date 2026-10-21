"use strict";

const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { Region, RegionalBrandingSetting, sequelize } = require("../models");
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
    "--success": hexToHslComponents(b.success_color),
    "--warning": hexToHslComponents(b.warning_color),
    "--info": hexToHslComponents(b.info_color),
    "--sidebar-nav-hover": hexToHslComponents(b.sidebar_nav_hover_color),
    "--sidebar-nav-active": hexToHslComponents(b.sidebar_nav_active_color),
    "--sidebar-nav-active-foreground": hexToHslComponents(b.sidebar_nav_active_text_color),
    "--sidebar-subnav-active": hexToHslComponents(b.sidebar_subnav_active_color),
    "--sidebar-subnav-active-foreground": hexToHslComponents(b.sidebar_subnav_active_text_color),
    "--sidebar-header-text": hexToHslComponents(b.sidebar_header_text_color),
    "--toolbar-button": hexToHslComponents(b.toolbar_button_color),
    "--toolbar-button-hover": hexToHslComponents(b.toolbar_button_hover_color),
    "--toolbar-button-foreground": hexToHslComponents(b.toolbar_button_text_color),
    "--table-header": hexToHslComponents(b.table_header_color),
    "--table-header-hover": hexToHslComponents(b.table_header_hover_color),
    "--table-header-foreground": hexToHslComponents(b.table_header_text_color),
  };
}

async function resolveEffectiveRegionalBranding(regionId) {
  if (!regionId) {
    return {
      ...DEFAULT_BRANDING,
      css_variables: brandingToCssVariables(DEFAULT_BRANDING),
      is_using_default: true,
      scope: "global",
    };
  }

  const region = await Region.findByPk(regionId);
  if (!region) {
    const error = new Error("Region not found.");
    error.status = 404;
    throw error;
  }

  const customRecord = await RegionalBrandingSetting.findOne({
    where: { region_id: regionId },
  });

  if (customRecord) {
    const plain = customRecord.toJSON ? customRecord.toJSON() : { ...customRecord };
    return {
      ...plain,
      css_variables: brandingToCssVariables(plain),
      is_using_default: false,
      scope: "region",
      region_name: region.name,
      region_code: region.code,
    };
  }

  // Fallback to global defaults with region name placeholder
  const fallback = {
    ...DEFAULT_BRANDING,
    system_name_full: `${region.name} Mining Bureau PMS`,
    system_name_short: `${region.code} PMS`,
    system_tagline: `Regional Strategic Planning and Execution — ${region.name}`,
    logo_primary_path: region.logo_path || DEFAULT_BRANDING.logo_primary_path,
  };

  return {
    ...fallback,
    css_variables: brandingToCssVariables(fallback),
    is_using_default: true,
    scope: "region",
    region_name: region.name,
    region_code: region.code,
  };
}

async function updateRegionalBranding(regionId, payload) {
  const region = await Region.findByPk(regionId);
  if (!region) {
    const error = new Error("Region not found.");
    error.status = 404;
    throw error;
  }

  // Color validation to prevent CSS or script injection
  for (const field of COLOR_FIELDS) {
    if (payload[field] !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(payload[field])) {
        const error = new Error(`Invalid color for ${field}. Use 6-digit hex format (e.g. #0C4A6E).`);
        error.status = 400;
        throw error;
      }
    }
  }

  let record = await RegionalBrandingSetting.findOne({ where: { region_id: regionId } });

  const fieldsToUpdate = {};
  if (payload.system_name_full !== undefined) fieldsToUpdate.system_name_full = String(payload.system_name_full).trim();
  if (payload.system_name_short !== undefined) fieldsToUpdate.system_name_short = String(payload.system_name_short).trim();
  if (payload.system_tagline !== undefined) fieldsToUpdate.system_tagline = payload.system_tagline ? String(payload.system_tagline).trim() : null;
  if (payload.logo_primary_path !== undefined) fieldsToUpdate.logo_primary_path = payload.logo_primary_path || null;
  if (payload.logo_secondary_path !== undefined) fieldsToUpdate.logo_secondary_path = payload.logo_secondary_path || null;
  if (payload.favicon_path !== undefined) fieldsToUpdate.favicon_path = payload.favicon_path || null;

  for (const field of COLOR_FIELDS) {
    if (payload[field] !== undefined) {
      fieldsToUpdate[field] = payload[field];
    }
  }

  if (record) {
    await record.update(fieldsToUpdate);
  } else {
    record = await RegionalBrandingSetting.create({
      region_id: regionId,
      system_name_full: fieldsToUpdate.system_name_full || `${region.name} Mining Bureau PMS`,
      system_name_short: fieldsToUpdate.system_name_short || `${region.code} PMS`,
      system_tagline: fieldsToUpdate.system_tagline || `Regional Planning — ${region.name}`,
      ...fieldsToUpdate,
    });
  }

  // If region logo was updated, sync to Region.logo_path
  if (fieldsToUpdate.logo_primary_path && fieldsToUpdate.logo_primary_path !== region.logo_path) {
    await region.update({ logo_path: fieldsToUpdate.logo_primary_path });
  }

  return resolveEffectiveRegionalBranding(regionId);
}

module.exports = {
  resolveEffectiveRegionalBranding,
  updateRegionalBranding,
  brandingToCssVariables,
};
