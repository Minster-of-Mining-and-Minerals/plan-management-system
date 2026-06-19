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
    const updated = await updateSystemSettings({
      expose_required_permissions: Boolean(req.body.expose_required_permissions),
    });

    await recordSystemAuditLog({
      module: "system_settings",
      action: "update",
      entityId: updated.system_setting_id,
      entityLabel: "System settings",
      summary: `Expose required permissions ${updated.expose_required_permissions ? "enabled" : "disabled"}`,
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
