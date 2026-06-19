"use strict";

const express = require("express");
const {
  getSystemSettingsHandler,
  getSecuritySystemSettingsHandler,
  updateSystemSettingsHandler,
} = require("../../controllers/config/systemSettingsController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

const router = express.Router();

router.get("/security", authenticateToken, getSecuritySystemSettingsHandler);
router.get("/", authenticateToken, checkPermission("SYSTEM_SETTINGS", "READ"), getSystemSettingsHandler);
router.put("/", authenticateToken, checkPermission("SYSTEM_SETTINGS", "UPDATE"), updateSystemSettingsHandler);

module.exports = router;
