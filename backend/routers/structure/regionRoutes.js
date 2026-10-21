"use strict";

const express = require("express");
const router = express.Router();
const regionController = require("../../controllers/structure/regionController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

// Public listing of active regions (useful for login/branding discovery if needed)
router.get("/public", async (req, res) => {
  try {
    const regionService = require("../../services/regionService");
    const regions = await regionService.listRegions({ is_active: true });
    return res.status(200).json({
      success: true,
      data: regions.map((r) => ({
        region_id: r.region_id,
        name: r.name,
        code: r.code,
        logo_path: r.logo_path,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.use(authenticateToken);

router.get(
  "/",
  checkPermission("REGIONS", "READ"),
  regionController.listRegions
);

router.get(
  "/:id",
  checkPermission("REGIONS", "READ"),
  regionController.getRegionById
);

router.post(
  "/",
  checkPermission("REGIONS", "CREATE"),
  regionController.createRegion
);

router.put(
  "/:id",
  checkPermission("REGIONS", "UPDATE"),
  regionController.updateRegion
);

router.patch(
  "/:id/status",
  checkPermission("REGIONS", "UPDATE"),
  regionController.toggleRegionActiveStatus
);

router.delete(
  "/:id",
  checkPermission("REGIONS", "DELETE"),
  regionController.deleteRegion
);

module.exports = router;
