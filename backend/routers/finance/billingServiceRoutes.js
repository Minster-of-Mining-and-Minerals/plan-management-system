"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const controller = require("../../controllers/finance/billingServiceController");
const {
  validateCreateService,
  validateUpdateService,
} = require("../../validators/finance/billingValidator");

router.use(authenticateToken, requireInternalAccount);

router.get("/active", checkPermission("billing_service", "view"), controller.listActive);
router.get("/", checkPermission("billing_service", "view"), controller.list);
router.get("/:serviceId", checkPermission("billing_service", "view"), controller.getById);
router.post(
  "/",
  checkPermission("billing_service", "create"),
  validateCreateService,
  controller.create
);
router.put(
  "/:serviceId",
  checkPermission("billing_service", "update"),
  validateUpdateService,
  controller.update
);
router.patch(
  "/:serviceId/activate",
  checkPermission("billing_service", "activate"),
  controller.activate
);
router.patch(
  "/:serviceId/deactivate",
  checkPermission("billing_service", "deactivate"),
  controller.deactivate
);
router.delete(
  "/:serviceId",
  checkPermission("billing_service", "delete"),
  controller.remove
);

module.exports = router;
