"use strict";

const express = require("express");
const router = express.Router();
const { listAuditLogs } = require("../../controllers/audit/auditLogController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/", checkPermission("audit_log", "view"), listAuditLogs);

module.exports = router;
