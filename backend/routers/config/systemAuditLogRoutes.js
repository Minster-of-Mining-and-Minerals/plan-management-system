const express = require("express");
const router = express.Router();

const {
  getSystemAuditLogs,
  getSystemAuditLogById,
} = require("../../controllers/config/systemAuditLogController");

const {
  validateListSystemAuditLogs,
  validateIdParam,
} = require("../../validators/config/systemAuditLogValidator");

const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get(
  "/",
  checkPermission("SYSTEM_AUDIT_LOGS", "READ"),
  validateListSystemAuditLogs,
  getSystemAuditLogs
);

router.get(
  "/:id",
  checkPermission("SYSTEM_AUDIT_LOGS", "READ"),
  validateIdParam,
  getSystemAuditLogById
);

module.exports = router;
