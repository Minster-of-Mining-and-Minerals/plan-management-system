"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreateCategory,
  validateUpdateCategory,
} = require("../../validators/prescription/prescriptionCategoryValidator");
const controller = require("../../controllers/prescription/prescriptionCategoryController");

router.use(authenticateToken, requireInternalAccount);

router.get("/", checkPermission("prescription_category", "view"), controller.list);
router.get("/:categoryId", checkPermission("prescription_category", "view"), controller.getById);
router.post(
  "/",
  checkPermission("prescription_category", "create"),
  validateCreateCategory,
  controller.create
);
router.put(
  "/:categoryId",
  checkPermission("prescription_category", "update"),
  validateUpdateCategory,
  controller.update
);
router.delete(
  "/:categoryId",
  checkPermission("prescription_category", "delete"),
  controller.remove
);

module.exports = router;
