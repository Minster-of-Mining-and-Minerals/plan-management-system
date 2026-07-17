"use strict";

const auditLogReadService = require("../../services/auditLogReadService");

const listAuditLogs = async (req, res) => {
  try {
    const data = await auditLogReadService.listAuditLogs(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list audit logs",
    });
  }
};

module.exports = { listAuditLogs };
