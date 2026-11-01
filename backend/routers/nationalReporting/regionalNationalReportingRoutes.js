"use strict";

const express = require("express");
const router = express.Router();
const regionalNationalReportingController = require("../../controllers/nationalReporting/regionalNationalReportingController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// List assigned requirements with mapping status for region
router.get(
  "/:regionId/requirements",
  checkPermission("regional_national_reporting", "read_assigned"),
  regionalNationalReportingController.listAssignedRequirements
);

// Stage A: Create / Update Potential Mapping
router.post(
  "/:regionId/assignments/:assignmentId/potential-mapping",
  checkPermission("regional_national_reporting", "create_mapping"),
  regionalNationalReportingController.createPotentialMapping
);

// Stage B: Confirm Mapping for Active Reporting Period
router.post(
  "/:regionId/mappings/:mappingId/confirm",
  checkPermission("regional_national_reporting", "confirm_mapping"),
  regionalNationalReportingController.confirmMapping
);

// Delete / Archive Mapping
router.delete(
  "/:regionId/mappings/:mappingId",
  checkPermission("regional_national_reporting", "delete_mapping"),
  regionalNationalReportingController.deleteMapping
);

// Publication Gateway: Publish Validated Regional Report
router.post(
  "/:regionId/mappings/:mappingId/publish",
  checkPermission("regional_national_reporting", "publish_validated"),
  regionalNationalReportingController.publishValidatedReport
);

// Publication History & Receipts
router.get(
  "/:regionId/publications",
  checkPermission("regional_national_reporting", "read_history"),
  regionalNationalReportingController.listPublicationHistory
);

module.exports = router;

