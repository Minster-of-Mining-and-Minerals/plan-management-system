"use strict";

const express = require("express");
const router = express.Router();
const purchasingCenterController = require("../../controllers/structure/purchasingCenterController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");
const { isSuperAdminActor } = require("../../utils/structureScopeUtils");

// Public listing of active purchasing centers
router.get("/public", async (req, res) => {
  try {
    const purchasingCenterService = require("../../services/purchasingCenterService");
    const list = await purchasingCenterService.listPurchasingCenters({ is_active: true });
    return res.status(200).json({
      success: true,
      data: list.map((pc) => ({
        purchasing_center_id: pc.purchasing_center_id,
        name: pc.name,
        code: pc.code,
        logo_path: pc.logo_path,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Authorization middleware: PC users can access their assigned center; federal users require PURCHASING_CENTERS:READ
const authorizePurchasingCenterRead = (req, res, next) => {
  if (isSuperAdminActor(req)) {
    return next();
  }

  if (req.user?.is_purchasing_center) {
    if (req.user.purchasing_center_id && req.user.purchasing_center_id === req.params.id) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Access denied. Cannot access a different purchasing center's details.",
    });
  }

  return checkPermission("PURCHASING_CENTERS", "READ")(req, res, next);
};

// Authorization middleware: PC users can list centers (scoped to own center by controller); federal users require PURCHASING_CENTERS:READ
const authorizePurchasingCenterList = (req, res, next) => {
  if (isSuperAdminActor(req)) {
    return next();
  }

  if (req.user?.is_purchasing_center) {
    return next();
  }

  return checkPermission("PURCHASING_CENTERS", "READ")(req, res, next);
};

router.use(authenticateToken);

router.get(
  "/",
  authorizePurchasingCenterList,
  purchasingCenterController.listPurchasingCenters
);

router.get(
  "/:id",
  authorizePurchasingCenterRead,
  purchasingCenterController.getPurchasingCenterById
);

router.post(
  "/",
  checkPermission("PURCHASING_CENTERS", "CREATE"),
  purchasingCenterController.createPurchasingCenter
);

router.put(
  "/:id",
  checkPermission("PURCHASING_CENTERS", "UPDATE"),
  purchasingCenterController.updatePurchasingCenter
);

router.patch(
  "/:id/status",
  checkPermission("PURCHASING_CENTERS", "UPDATE"),
  purchasingCenterController.togglePurchasingCenterActiveStatus
);

router.delete(
  "/:id",
  checkPermission("PURCHASING_CENTERS", "DELETE"),
  purchasingCenterController.deletePurchasingCenter
);

module.exports = router;
