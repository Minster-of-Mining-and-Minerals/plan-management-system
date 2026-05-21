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

// Public — used by login page and public site
router.get("/active", getActiveBranding);

router.post("/", validateCreateBranding, createBranding);
router.get("/", getBrandingList);
router.get("/:id", getBrandingById);
router.put("/:id", validateUpdateBranding, updateBranding);
router.patch("/:id/activate", activateBranding);
router.delete("/:id", deleteBranding);

module.exports = router;
