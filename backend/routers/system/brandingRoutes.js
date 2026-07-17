"use strict";

const express = require("express");
const router = express.Router();

const {
  validateCreateBranding,
  validateUpdateBranding,
} = require("../../validators/system/brandingValidator");

const {
  createBranding,
  getBrandingList,
  getActiveBranding,
  getBrandingById,
  updateBranding,
  deleteBranding,
  activateBranding,
} = require("../../controllers/system/brandingController");

const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

// Public — login page / marketing site
router.get("/active", getActiveBranding);

router.use(authenticateToken, requireInternalAccount);

router.post("/", checkPermission("branding", "create"), validateCreateBranding, createBranding);
router.get("/", checkPermission("branding", "read"), getBrandingList);
router.get("/:id", checkPermission("branding", "read"), getBrandingById);
router.put(
  "/:id",
  checkPermission("branding", "update"),
  validateUpdateBranding,
  updateBranding
);
router.patch("/:id/activate", checkPermission("branding", "update"), activateBranding);
router.delete("/:id", checkPermission("branding", "delete"), deleteBranding);

module.exports = router;
