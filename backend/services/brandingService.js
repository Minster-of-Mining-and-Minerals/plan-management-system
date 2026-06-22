"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const { BrandingSetting, GovernmentStructure } = require("../models");

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

const BRANDING_VALUE_FIELDS = [
  ...TEXT_FIELDS,
  ...LOGO_FIELDS,
  ...COLOR_FIELDS,
];

function buildUpdateFields(payload) {
  return {
    system_name_full: payload.system_name_full,
    system_name_short: payload.system_name_short,
    system_tagline: payload.system_tagline ?? null,
    logo_primary_path: payload.logo_primary_path ?? null,
    logo_secondary_path: payload.logo_secondary_path ?? null,
    favicon_path: payload.favicon_path ?? null,
    primary_color: payload.primary_color,
    secondary_color: payload.secondary_color,
    accent_color: payload.accent_color,
    success_color: payload.success_color,
    warning_color: payload.warning_color,
    error_color: payload.error_color,
    info_color: payload.info_color,
    background_color: payload.background_color,
    surface_color: payload.surface_color,
    sidebar_color: payload.sidebar_color,
    header_color: payload.header_color,
    text_primary_color: payload.text_primary_color,
    text_secondary_color: payload.text_secondary_color,
    border_color: payload.border_color,
  };
}

async function getOrCreateGlobalBranding(transaction) {
  let record = await BrandingSetting.findByPk(DEFAULT_BRANDING_ID, { transaction });
  if (!record) {
    const now = new Date();
    record = await BrandingSetting.create(
      {
        ...DEFAULT_BRANDING,
        created_at: now,
        updated_at: now,
      },
      { transaction }
    );
  }
  return record;
}

async function getSectorBrandingRecord(governmentStructureId, transaction) {
  if (!governmentStructureId) {
    return null;
  }
  return BrandingSetting.findOne({
    where: { government_structure_id: governmentStructureId },
    transaction,
  });
}

async function getAncestorStructureIds(governmentStructureId, transaction) {
  const ids = [];
  const seen = new Set();
  let currentId = governmentStructureId;

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    ids.push(currentId);

    const structure = await GovernmentStructure.findByPk(currentId, {
      attributes: ["parent_id"],
      transaction,
    });

    if (!structure) {
      break;
    }

    currentId = structure.parent_id;
  }

  return ids;
}

/**
 * Resolve branding for a sector: nearest ancestor override, else global default.
 */
async function resolveEffectiveBranding(governmentStructureId, options = {}) {
  const { transaction } = options;
  const globalRecord = await getOrCreateGlobalBranding(transaction);
  const global = pickBrandingPayload(globalRecord);

  if (!governmentStructureId) {
    return {
      effective: global,
      global,
      override: null,
      scope: "global",
      government_structure_id: null,
      is_using_default: true,
      resolved_from_structure_id: null,
    };
  }

  const ancestorIds = await getAncestorStructureIds(governmentStructureId, transaction);
  const sectorRows = await BrandingSetting.findAll({
    where: {
      government_structure_id: { [Op.in]: ancestorIds },
    },
    transaction,
  });

  const rowByStructureId = new Map(
    sectorRows.map((row) => [row.government_structure_id, row])
  );

  let resolvedRow = null;
  let resolvedFromStructureId = null;

  for (const structureId of ancestorIds) {
    const row = rowByStructureId.get(structureId);
    if (row) {
      resolvedRow = row;
      resolvedFromStructureId = structureId;
      break;
    }
  }

  const directOverrideRow = rowByStructureId.get(governmentStructureId) ?? null;
  const effective = resolvedRow ? pickBrandingPayload(resolvedRow) : global;

  return {
    effective,
    global,
    override: directOverrideRow ? pickBrandingPayload(directOverrideRow) : null,
    scope: "sector",
    government_structure_id: governmentStructureId,
    is_using_default: !resolvedRow,
    resolved_from_structure_id: resolvedFromStructureId,
  };
}

function buildBrandingResponse(resolved, options = {}) {
  const { includeMeta = false } = options;
  const effective = resolved.effective || DEFAULT_BRANDING;
  const payload = {
    ...effective,
    css_variables: brandingToCssVariables(effective),
    resolved_from_structure_id: resolved.resolved_from_structure_id ?? null,
    is_using_default: Boolean(resolved.is_using_default),
  };

  if (includeMeta) {
    payload.meta = {
      scope: resolved.scope,
      government_structure_id: resolved.government_structure_id ?? null,
      is_using_default: Boolean(resolved.is_using_default),
      resolved_from_structure_id: resolved.resolved_from_structure_id ?? null,
      override: resolved.override,
      global: resolved.global,
    };
  }

  return payload;
}

async function upsertSectorBranding(governmentStructureId, updates, transaction) {
  const structure = await GovernmentStructure.findByPk(governmentStructureId, { transaction });
  if (!structure) {
    const error = new Error("Sector structure not found.");
    error.status = 404;
    throw error;
  }

  const globalRecord = await getOrCreateGlobalBranding(transaction);
  let record = await getSectorBrandingRecord(governmentStructureId, transaction);
  const previous = record
    ? pickBrandingPayload(record)
    : pickBrandingPayload(globalRecord);

  const merged = {
    ...previous,
    ...updates,
    government_structure_id: governmentStructureId,
  };

  const validationError = validateReadableTheme(merged);
  if (validationError) {
    const error = new Error(validationError);
    error.status = 400;
    throw error;
  }

  const fields = buildUpdateFields(merged);

  if (record) {
    await record.update(fields, { transaction });
    await record.reload({ transaction });
  } else {
    record = await BrandingSetting.create(
      {
        branding_setting_id: uuidv4(),
        government_structure_id: governmentStructureId,
        ...fields,
      },
      { transaction }
    );
  }

  return {
    record,
    previous,
    updated: pickBrandingPayload(record),
  };
}

async function updateGlobalBranding(updates, transaction) {
  const record = await getOrCreateGlobalBranding(transaction);
  const previous = pickBrandingPayload(record);
  const merged = {
    ...previous,
    ...updates,
    branding_setting_id: DEFAULT_BRANDING_ID,
    government_structure_id: null,
  };

  const validationError = validateReadableTheme(merged);
  if (validationError) {
    const error = new Error(validationError);
    error.status = 400;
    throw error;
  }

  await record.update(buildUpdateFields(merged), { transaction });
  await record.reload({ transaction });

  return {
    record,
    previous,
    updated: pickBrandingPayload(record),
  };
}

async function deleteSectorBranding(governmentStructureId, transaction) {
  const record = await getSectorBrandingRecord(governmentStructureId, transaction);
  if (!record) {
    const error = new Error("No sector branding override exists for this structure.");
    error.status = 404;
    throw error;
  }

  const previous = pickBrandingPayload(record);
  await record.destroy({ transaction });

  return { previous };
}

module.exports = {
  DEFAULT_BRANDING_ID,
  DEFAULT_BRANDING,
  COLOR_FIELDS,
  TEXT_FIELDS,
  LOGO_FIELDS,
  BRANDING_VALUE_FIELDS,
  hexToHslComponents,
  pickBrandingPayload,
  brandingToCssVariables,
  validateReadableTheme,
  buildUpdateFields,
  getOrCreateGlobalBranding,
  getSectorBrandingRecord,
  getAncestorStructureIds,
  resolveEffectiveBranding,
  buildBrandingResponse,
  upsertSectorBranding,
  updateGlobalBranding,
  deleteSectorBranding,
};
