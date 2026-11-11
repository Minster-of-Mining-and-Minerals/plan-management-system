"use strict";

const express = require("express");
const router = express.Router();
const nationalReportingController = require("../../controllers/nationalReporting/nationalReportingController");
const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Units Catalog
router.get("/units-catalog", nationalReportingController.getUnitsCatalog);

// National Dashboard Summary
router.get(
  "/dashboard-summary",
  checkPermission("national_reporting", "read_dashboard"),
  nationalReportingController.getNationalDashboardSummary
);

// Published Records
router.get(
  "/published-records",
  checkPermission("national_reporting", "read_published"),
  nationalReportingController.listPublishedRecords
);

router.get(
  "/published-records/:id",
  checkPermission("national_reporting", "read_published"),
  nationalReportingController.getPublishedRecordById
);

router.post(
  "/published-records/:id/clarification",
  checkPermission("national_reporting", "request_clarification"),
  nationalReportingController.requestClarification
);

// Submissions & Published Records Versions
router.get(
  "/submissions/versions",
  checkAnyPermission([
    { resource: "national_reporting", action: "read_published" },
    { resource: "regional_national_reporting", action: "read_history" },
    { resource: "regional_national_reporting", action: "read_assigned" },
  ]),
  nationalReportingController.getSubmissionVersions
);

router.get(
  "/published-records/:recordId/versions",
  checkAnyPermission([
    { resource: "national_reporting", action: "read_published" },
    { resource: "regional_national_reporting", action: "read_history" },
    { resource: "regional_national_reporting", action: "read_assigned" },
  ]),
  nationalReportingController.getSubmissionVersions
);

// Assignments
router.get(
  "/assignments",
  checkPermission("national_reporting", "read_assignment"),
  nationalReportingController.listAssignments
);

router.put(
  "/assignments/:assignmentId",
  checkPermission("national_reporting", "assign_region"),
  nationalReportingController.updateAssignment
);

router.post(
  "/assignments/:assignmentId/lock-override",
  checkPermission("national_reporting", "assign_region"),
  nationalReportingController.togglePeriodLockOverride
);

// Per-Region Reporting Method & Form Controls
router.get(
  "/regions/:regionId/config",
  checkPermission("national_reporting", "read_assignment"),
  nationalReportingController.getRegionReportingConfig
);

router.put(
  "/regions/:regionId/config",
  checkPermission("national_reporting", "assign_region"),
  nationalReportingController.updateRegionReportingConfig
);

// Requirement CRUD & Regional Assignments
router.get(
  "/",
  checkPermission("national_reporting", "read_requirement"),
  nationalReportingController.listRequirements
);

router.post(
  "/",
  checkPermission("national_reporting", "create_requirement"),
  nationalReportingController.createRequirement
);

router.get(
  "/:id",
  checkPermission("national_reporting", "read_requirement"),
  nationalReportingController.getRequirementById
);

router.put(
  "/:id",
  checkPermission("national_reporting", "update_requirement"),
  nationalReportingController.updateRequirement
);

router.delete(
  "/:id",
  checkPermission("national_reporting", "delete_requirement"),
  nationalReportingController.deleteRequirement
);

router.post(
  "/:id/assign",
  checkPermission("national_reporting", "assign_region"),
  nationalReportingController.assignRequirementToRegions
);

module.exports = router;

