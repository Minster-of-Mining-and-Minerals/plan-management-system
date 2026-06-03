"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/diagnosis/medicalDiagramController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreateMedicalDiagram,
  validateUpdateMedicalDiagram,
} = require("../../validators/diagnosis/medicalDiagramValidator");

router.use(authenticateToken, requireInternalAccount);

router.get("/meta", checkPermission("diagnosis_forms", "read"), controller.getMeta);
router.post(
  "/seed-defaults",
  checkPermission("diagnosis_forms", "create"),
  controller.seedDefaults
);
router.get("/", checkPermission("diagnosis_forms", "read"), controller.list);
router.post(
  "/",
  checkPermission("diagnosis_forms", "create"),
  validateCreateMedicalDiagram,
  controller.create
);
router.get(
  "/:diagramId",
  checkPermission("diagnosis_forms", "read"),
  controller.getById
);
router.put(
  "/:diagramId",
  checkPermission("diagnosis_forms", "update"),
  validateUpdateMedicalDiagram,
  controller.update
);
router.delete(
  "/:diagramId",
  checkPermission("diagnosis_forms", "delete"),
  controller.remove
);

module.exports = router;
