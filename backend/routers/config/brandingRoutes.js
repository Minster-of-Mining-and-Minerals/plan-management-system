const express = require("express");
const router = express.Router();

const {
  getPublicBranding,
  getBrandingSettings,
  updateBrandingSettings,
  restoreDefaultBranding,
  getBrandingAuditLogs,
} = require("../../controllers/config/brandingController");

const { validateUpdateBranding } = require("../../validators/config/brandingValidator");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.get("/public", getPublicBranding);

router.use(authenticateToken);

router.get("/", checkPermission("BRANDING_SETTINGS", "READ"), getBrandingSettings);
router.put(
  "/",
  checkPermission("BRANDING_SETTINGS", "UPDATE"),
  validateUpdateBranding,
  updateBrandingSettings
);
router.post(
  "/restore-defaults",
  checkPermission("BRANDING_SETTINGS", "UPDATE"),
  restoreDefaultBranding
);
router.get(
  "/audit-logs",
  checkPermission("BRANDING_SETTINGS", "READ"),
  getBrandingAuditLogs
);

module.exports = router;
