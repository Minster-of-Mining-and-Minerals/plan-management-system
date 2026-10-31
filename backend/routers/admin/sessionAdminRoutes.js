"use strict";

const express = require("express");
const router = express.Router();
const {
  getSessionMetrics,
  getSessions,
  terminateSessionAdmin,
  terminateUserSessionsAdmin,
  getDeviceRestrictions,
  createDeviceRestriction,
  deleteDeviceRestriction,
  getIpRestrictions,
  createIpRestriction,
  deleteIpRestriction,
  getSessionSecurityLogs,
} = require("../../controllers/admin/sessionAdminController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Session metrics
router.get("/metrics", checkPermission("USER_SESSION", "VIEW"), getSessionMetrics);

// Sessions table
router.get("/", checkPermission("USER_SESSION", "VIEW"), getSessions);

// Terminate individual session
router.post(
  "/:sessionId/terminate",
  checkPermission("USER_SESSION", "TERMINATE"),
  terminateSessionAdmin
);

// Terminate all sessions for a user
router.post(
  "/user/:userId/terminate-all",
  checkPermission("USER_SESSION", "TERMINATE_ALL"),
  terminateUserSessionsAdmin
);

// Device restrictions
router.get(
  "/devices",
  checkPermission("USER_SESSION", "VIEW"),
  getDeviceRestrictions
);
router.post(
  "/devices",
  checkPermission("USER_SESSION", "RESTRICT_DEVICE"),
  createDeviceRestriction
);
router.delete(
  "/devices/:restrictionId",
  checkPermission("USER_SESSION", "UNRESTRICT_DEVICE"),
  deleteDeviceRestriction
);

// IP restrictions
router.get(
  "/ips",
  checkPermission("USER_SESSION", "VIEW"),
  getIpRestrictions
);
router.post(
  "/ips",
  checkPermission("USER_SESSION", "RESTRICT_IP"),
  createIpRestriction
);
router.delete(
  "/ips/:restrictionId",
  checkPermission("USER_SESSION", "UNRESTRICT_IP"),
  deleteIpRestriction
);

// Security audit logs
router.get(
  "/logs",
  checkPermission("USER_SESSION", "VIEW_AUDIT"),
  getSessionSecurityLogs
);

module.exports = router;

