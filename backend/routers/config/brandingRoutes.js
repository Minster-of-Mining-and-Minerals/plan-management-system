const express = require("express");
const router = express.Router();

const {
  getPublicBranding,
  getBrandingSettings,
  updateBrandingSettings,
  restoreDefaultBranding,
  deleteSectorBrandingSettings,
} = require("../../controllers/config/brandingController");

const {
  validateUpdateBranding,
  validateBrandingStructureQuery,
  validateBrandingStructureParams,
} = require("../../validators/config/brandingValidator");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.get("/public", validateBrandingStructureQuery, getPublicBranding);

router.use(authenticateToken);

router.get(
  "/",
  checkPermission("BRANDING_SETTINGS", "READ"),
  validateBrandingStructureQuery,
  getBrandingSettings
);
router.put(
  "/",
  checkPermission("BRANDING_SETTINGS", "UPDATE"),
  validateUpdateBranding,
  updateBrandingSettings
);
router.delete(
  "/sector/:government_structure_id",
  checkPermission("BRANDING_SETTINGS", "UPDATE"),
  validateBrandingStructureParams,
  deleteSectorBrandingSettings
);
router.post(
  "/restore-defaults",
  checkPermission("BRANDING_SETTINGS", "UPDATE"),
  restoreDefaultBranding
);

module.exports = router;
