"use strict";

const express = require("express");
const router = express.Router();
const companyBrandingController = require("../../controllers/config/companyBrandingController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

// Public route to get company branding by company_id or code
router.get("/public", companyBrandingController.getPublicCompanyBranding);

router.use(authenticateToken);

router.get(
  "/",
  checkPermission("COMPANY_BRANDING", "READ"),
  companyBrandingController.getCompanyBranding
);

router.put(
  "/",
  checkPermission("COMPANY_BRANDING", "UPDATE"),
  companyBrandingController.updateCompanyBranding
);

module.exports = router;
