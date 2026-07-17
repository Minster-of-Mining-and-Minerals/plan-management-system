"use strict";

const express = require("express");
const router = express.Router();
const {
  listAuditLogs,
  exportAuditLogs,
} = require("../../controllers/audit/auditLogController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/", checkPermission("audit_log", "view"), listAuditLogs);
router.get("/export", checkPermission("audit_log", "view"), exportAuditLogs);

module.exports = router;
