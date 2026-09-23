"use strict";

const {
  getSystemSettings,
  updateSystemSettings,
} = require("../../services/systemSettingsService");
const { recordSystemAuditLog, getClientIp } = require("../../services/auditLogService");

async function getSystemSettingsHandler(req, res) {
  try {
    const settings = await getSystemSettings();
    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getSecuritySystemSettingsHandler(req, res) {
  try {
    const settings = await getSystemSettings();
    return res.json({
      success: true,
      data: {
        expose_required_permissions: settings.expose_required_permissions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateSystemSettingsHandler(req, res) {
  try {
    const previous = await getSystemSettings();
    const updates = {};

    if (req.body.expose_required_permissions !== undefined) {
      updates.expose_required_permissions = Boolean(req.body.expose_required_permissions);
    }
    if (req.body.allow_achievement_assignment_bypass !== undefined) {
      updates.allow_achievement_assignment_bypass = Boolean(
        req.body.allow_achievement_assignment_bypass
      );
    }

    const updated = await updateSystemSettings(updates);

    const summaryParts = [];
    if (updates.expose_required_permissions !== undefined) {
      summaryParts.push(
        `permission disclosure ${updated.expose_required_permissions ? "enabled" : "disabled"}`
      );
    }
    if (updates.allow_achievement_assignment_bypass !== undefined) {
      summaryParts.push(
        `achievement assignment bypass ${updated.allow_achievement_assignment_bypass ? "enabled" : "disabled"}`
      );
    }

    await recordSystemAuditLog({
      module: "system_settings",
      action: "update",
      entityId: updated.system_setting_id,
      entityLabel: "System settings",
      summary: summaryParts.join("; ") || "System settings updated",
      previousValues: previous,
      newValues: updated,
      changedBy: req.user.user_id,
      ipAddress: getClientIp(req),
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getSystemSettingsHandler,
  getSecuritySystemSettingsHandler,
  updateSystemSettingsHandler,
};
