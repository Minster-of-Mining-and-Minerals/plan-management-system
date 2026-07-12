"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const controller = require("../../controllers/finance/billingServiceCategoryController");
const {
  validateCreateCategory,
  validateUpdateCategory,
} = require("../../validators/finance/billingValidator");

router.use(authenticateToken, requireInternalAccount);

router.get("/", checkPermission("billing_service_category", "view"), controller.list);
router.get(
  "/:categoryId",
  checkPermission("billing_service_category", "view"),
  controller.getById
);
router.post(
  "/",
  checkPermission("billing_service_category", "create"),
  validateCreateCategory,
  controller.create
);
router.put(
  "/:categoryId",
  checkPermission("billing_service_category", "update"),
  validateUpdateCategory,
  controller.update
);
router.delete(
  "/:categoryId",
  checkPermission("billing_service_category", "delete"),
  controller.remove
);

module.exports = router;
