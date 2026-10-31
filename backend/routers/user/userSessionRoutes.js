"use strict";

const express = require("express");
const router = express.Router();
const {
  getMySessions,
  terminateMySession,
  terminateOtherSessions,
  getMyDevices,
  restrictMyDevice,
  unrestrictMyDevice,
} = require("../../controllers/user/userSessionController");
const {
  authenticateToken,
  checkAnyPermission,
} = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// User sessions listing
router.get(
  "/",
  checkAnyPermission([
    { resource: "USER_SESSION", action: "VIEW_OWN" },
    { resource: "USER_SESSION", action: "VIEW" },
  ]),
  getMySessions
);

// Terminate all other sessions
router.post(
  "/terminate-other",
  checkAnyPermission([
    { resource: "USER_SESSION", action: "TERMINATE_ALL_OWN" },
    { resource: "USER_SESSION", action: "TERMINATE_ALL" },
  ]),
  terminateOtherSessions
);

// Terminate a specific session
router.post(
  "/:sessionId/terminate",
  checkAnyPermission([
    { resource: "USER_SESSION", action: "TERMINATE_OWN" },
    { resource: "USER_SESSION", action: "TERMINATE" },
  ]),
  terminateMySession
);

// User devices listing
router.get(
  "/devices",
  checkAnyPermission([
    { resource: "USER_SESSION", action: "VIEW_OWN" },
    { resource: "USER_SESSION", action: "VIEW" },
  ]),
  getMyDevices
);

// Restrict own device
router.post(
  "/devices/restrict",
  checkAnyPermission([
    { resource: "USER_SESSION", action: "RESTRICT_OWN_DEVICE" },
    { resource: "USER_SESSION", action: "RESTRICT_DEVICE" },
  ]),
  restrictMyDevice
);

// Unrestrict own device
router.post(
  "/devices/unrestrict",
  checkAnyPermission([
    { resource: "USER_SESSION", action: "UNRESTRICT_OWN_DEVICE" },
    { resource: "USER_SESSION", action: "UNRESTRICT_DEVICE" },
  ]),
  unrestrictMyDevice
);

module.exports = router;

