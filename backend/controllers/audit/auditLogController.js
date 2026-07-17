"use strict";

const auditLogReadService = require("../../services/auditLogReadService");
const { sendError } = require("../../utils/httpError");
const { logAudit, auditContextFromReq } = require("../../services/auditService");

const listAuditLogs = async (req, res) => {
  try {
    const data = await auditLogReadService.listAuditLogs(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, req);
  }
};

const exportAuditLogs = async (req, res) => {
  try {
    const { csv, count } = await auditLogReadService.exportAuditLogsCsv(req.query);
    const ctx = auditContextFromReq(req, {
      module: "audit",
      outcome: "success",
      export_format: "csv",
      row_count: count,
    });
    await logAudit({
      actorUserId: req.user?.user_id,
      action: "audit_export",
      resourceType: "audit_log",
      resourceId: null,
      details: ctx.details,
      ipAddress: ctx.ipAddress,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-logs-${stamp}.csv"`
    );
    return res.status(200).send(csv);
  } catch (error) {
    return sendError(res, error, req);
  }
};

module.exports = { listAuditLogs, exportAuditLogs };
