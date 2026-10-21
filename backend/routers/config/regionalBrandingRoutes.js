"use strict";

const express = require("express");
const router = express.Router();
const regionalBrandingController = require("../../controllers/config/regionalBrandingController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

// Public route to get regional branding by region_id or code
router.get("/public", regionalBrandingController.getPublicRegionalBranding);

router.use(authenticateToken);

router.get(
  "/",
  checkPermission("REGIONAL_BRANDING", "READ"),
  regionalBrandingController.getRegionalBranding
);

router.put(
  "/",
  checkPermission("REGIONAL_BRANDING", "UPDATE"),
  regionalBrandingController.updateRegionalBranding
);

module.exports = router;
