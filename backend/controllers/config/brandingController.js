"use strict";

const { sequelize } = require("../../models");
const {
  DEFAULT_BRANDING,
  DEFAULT_BRANDING_ID,
  resolveEffectiveBranding,
  buildBrandingResponse,
  upsertSectorBranding,
  updateGlobalBranding,
  deleteSectorBranding,
} = require("../../services/brandingService");
const {
  AUDIT_MODULES,
  getClientIp,
  recordSystemAuditLog,
} = require("../../services/auditLogService");
const {
  isSuperAdminActor,
  resolveManageableStructureId,
  sendScopeError,
} = require("../../utils/structureScopeUtils");

function parseOptionalStructureId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value);
}

function resolveReadStructureId(req) {
  const requestedId = parseOptionalStructureId(req.query.government_structure_id);

  if (isSuperAdminActor(req)) {
    return requestedId;
  }

  if (requestedId) {
    return resolveManageableStructureId(req, requestedId);
  }

  return resolveManageableStructureId(req, null);
}

function resolveWriteTarget(req) {
  const requestedId = parseOptionalStructureId(req.body.government_structure_id);

  if (requestedId === null) {
    if (!isSuperAdminActor(req)) {
      const error = new Error("Only Super Admin can update system default branding.");
      error.status = 403;
      throw error;
    }
    return { scope: "global", government_structure_id: null };
  }

  const structureId = resolveManageableStructureId(req, requestedId);
  if (!structureId) {
    const error = new Error("A sector structure is required for sector branding.");
    error.status = 400;
    throw error;
  }

  return { scope: "sector", government_structure_id: structureId };
}

function resolveDeleteStructureId(req) {
  const structureId = resolveManageableStructureId(req, req.params.government_structure_id);
  if (!structureId) {
    const error = new Error("A sector structure is required.");
    error.status = 400;
    throw error;
  }
  return structureId;
}

function stripScopeFields(body) {
  const payload = { ...body };
  delete payload.government_structure_id;
  return payload;
}

const getPublicBranding = async (req, res) => {
  try {
    const structureId = parseOptionalStructureId(req.query.government_structure_id);
    const resolved = await resolveEffectiveBranding(structureId);

    return res.json({
      success: true,
      data: buildBrandingResponse(resolved),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getBrandingSettings = async (req, res) => {
  try {
    const structureId = resolveReadStructureId(req);
    const resolved = await resolveEffectiveBranding(structureId);

    return res.json({
      success: true,
      data: buildBrandingResponse(resolved, { includeMeta: true }),
    });
  } catch (error) {
    if (error.status) {
      return sendScopeError(res, error);
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateBrandingSettings = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const target = resolveWriteTarget(req);
    const updates = stripScopeFields(req.body);

    let previous;
    let updated;
    let entityId;
    let entityLabel;
    let auditStructureId = null;

    if (target.scope === "global") {
      const result = await updateGlobalBranding(updates, t);
      previous = result.previous;
      updated = result.updated;
      entityId = DEFAULT_BRANDING_ID;
      entityLabel = updated.system_name_full;
    } else {
      const result = await upsertSectorBranding(
        target.government_structure_id,
        updates,
        t
      );
      previous = result.previous;
      updated = result.updated;
      entityId = updated.branding_setting_id;
      entityLabel = updated.system_name_full;
      auditStructureId = target.government_structure_id;
    }

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.BRANDING_SETTINGS,
        action: "update",
        entityId,
        entityLabel,
        previousValues: {
          ...previous,
          government_structure_id: auditStructureId,
        },
        newValues: {
          ...updated,
          government_structure_id: auditStructureId,
        },
        changedBy: req.user.user_id,
        ipAddress: getClientIp(req),
      },
      t
    );

    await t.commit();

    const resolved = await resolveEffectiveBranding(target.government_structure_id);

    return res.json({
      success: true,
      data: buildBrandingResponse(resolved, { includeMeta: true }),
      message:
        target.scope === "global"
          ? "System default branding updated successfully"
          : "Sector branding updated successfully",
    });
  } catch (error) {
    await t.rollback();
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const restoreDefaultBranding = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!isSuperAdminActor(req)) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can restore system default branding.",
      });
    }

    const result = await updateGlobalBranding(
      {
        system_name_full: DEFAULT_BRANDING.system_name_full,
        system_name_short: DEFAULT_BRANDING.system_name_short,
        system_tagline: DEFAULT_BRANDING.system_tagline,
        logo_primary_path: DEFAULT_BRANDING.logo_primary_path,
        logo_secondary_path: DEFAULT_BRANDING.logo_secondary_path,
        favicon_path: DEFAULT_BRANDING.favicon_path,
        primary_color: DEFAULT_BRANDING.primary_color,
        secondary_color: DEFAULT_BRANDING.secondary_color,
        accent_color: DEFAULT_BRANDING.accent_color,
        success_color: DEFAULT_BRANDING.success_color,
        warning_color: DEFAULT_BRANDING.warning_color,
        error_color: DEFAULT_BRANDING.error_color,
        info_color: DEFAULT_BRANDING.info_color,
        background_color: DEFAULT_BRANDING.background_color,
        surface_color: DEFAULT_BRANDING.surface_color,
        sidebar_color: DEFAULT_BRANDING.sidebar_color,
        header_color: DEFAULT_BRANDING.header_color,
        text_primary_color: DEFAULT_BRANDING.text_primary_color,
        text_secondary_color: DEFAULT_BRANDING.text_secondary_color,
        border_color: DEFAULT_BRANDING.border_color,
      },
      t
    );

    const { previous, updated } = result;

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.BRANDING_SETTINGS,
        action: "restore",
        entityId: DEFAULT_BRANDING_ID,
        entityLabel: updated.system_name_full,
        previousValues: previous,
        newValues: updated,
        changedBy: req.user.user_id,
        ipAddress: getClientIp(req),
      },
      t
    );

    await t.commit();

    const resolved = await resolveEffectiveBranding(null);

    return res.json({
      success: true,
      data: buildBrandingResponse(resolved, { includeMeta: true }),
      message: "Branding restored to system defaults",
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSectorBrandingSettings = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const structureId = resolveDeleteStructureId(req);
    const { previous } = await deleteSectorBranding(structureId, t);

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.BRANDING_SETTINGS,
        action: "delete",
        entityId: previous.branding_setting_id,
        entityLabel: previous.system_name_full,
        previousValues: {
          ...previous,
          government_structure_id: structureId,
        },
        newValues: null,
        changedBy: req.user.user_id,
        ipAddress: getClientIp(req),
      },
      t
    );

    await t.commit();

    const resolved = await resolveEffectiveBranding(structureId);

    return res.json({
      success: true,
      data: buildBrandingResponse(resolved, { includeMeta: true }),
      message: "Sector branding reset to inherited defaults",
    });
  } catch (error) {
    await t.rollback();
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublicBranding,
  getBrandingSettings,
  updateBrandingSettings,
  restoreDefaultBranding,
  deleteSectorBrandingSettings,
};
