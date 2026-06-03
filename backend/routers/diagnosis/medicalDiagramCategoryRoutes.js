"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/diagnosis/medicalDiagramCategoryController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreateMedicalDiagramCategory,
  validateUpdateMedicalDiagramCategory,
} = require("../../validators/diagnosis/medicalDiagramCategoryValidator");

router.use(authenticateToken, requireInternalAccount);

router.get("/", checkPermission("diagnosis_forms", "read"), controller.list);
router.post(
  "/",
  checkPermission("diagnosis_forms", "create"),
  validateCreateMedicalDiagramCategory,
  controller.create
);
router.get(
  "/:categoryId",
  checkPermission("diagnosis_forms", "read"),
  controller.getById
);
router.put(
  "/:categoryId",
  checkPermission("diagnosis_forms", "update"),
  validateUpdateMedicalDiagramCategory,
  controller.update
);
router.delete(
  "/:categoryId",
  checkPermission("diagnosis_forms", "delete"),
  controller.remove
);

module.exports = router;
