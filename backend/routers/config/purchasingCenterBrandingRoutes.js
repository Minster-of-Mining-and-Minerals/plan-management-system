"use strict";

const express = require("express");
const router = express.Router();
const purchasingCenterBrandingController = require("../../controllers/config/purchasingCenterBrandingController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

// Public route to get purchasing center branding by purchasing_center_id or code
router.get("/public", purchasingCenterBrandingController.getPublicPurchasingCenterBranding);

router.use(authenticateToken);

router.get(
  "/",
  checkPermission("PURCHASING_CENTER_BRANDING", "READ"),
  purchasingCenterBrandingController.getPurchasingCenterBranding
);

router.put(
  "/",
  checkPermission("PURCHASING_CENTER_BRANDING", "UPDATE"),
  purchasingCenterBrandingController.updatePurchasingCenterBranding
);

module.exports = router;
