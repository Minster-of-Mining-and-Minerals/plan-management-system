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

const { isSuperAdminActor } = require("../../utils/structureScopeUtils");

// Authorization middleware: regional users can access their assigned region; federal users require REGIONS:READ
const authorizeRegionRead = (req, res, next) => {
  if (isSuperAdminActor(req)) {
    return next();
  }

  if (req.user?.is_regional) {
    if (req.user.region_id && req.user.region_id === req.params.id) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Access denied. Cannot access a different region's details.",
    });
  }

  return checkPermission("REGIONS", "READ")(req, res, next);
};

// Authorization middleware: regional users can list regions (scoped to own region by controller); federal users require REGIONS:READ
const authorizeRegionList = (req, res, next) => {
  if (isSuperAdminActor(req)) {
    return next();
  }

  if (req.user?.is_regional) {
    return next();
  }

  return checkPermission("REGIONS", "READ")(req, res, next);
};

router.use(authenticateToken);

router.get(
  "/",
  authorizeRegionList,
  regionController.listRegions
);

router.get(
  "/:id",
  authorizeRegionRead,
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
