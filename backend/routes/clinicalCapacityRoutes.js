"use strict";

const express = require("express");
const router = express.Router();
const clinicalCapacityController = require("../controllers/capacity/clinicalCapacityController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/hospital",
  checkPermission("operations", "operations:capacity_view"),
  clinicalCapacityController.getHospitalCapacity
);

router.get(
  "/departments",
  checkPermission("operations", "operations:capacity_view"),
  clinicalCapacityController.getDepartmentCapacity
);

router.get(
  "/providers",
  checkPermission("operations", "operations:availability_view"),
  clinicalCapacityController.getDepartmentAvailabilityBoard
);

router.get(
  "/availability/:providerId",
  checkPermission("operations", "operations:availability_view"),
  clinicalCapacityController.getProviderAvailability
);

router.get(
  "/forecast",
  checkPermission("operations", "operations:forecast_view"),
  clinicalCapacityController.getCapacityForecast
);

router.get(
  "/appointments",
  checkPermission("operations", "operations:capacity_view"),
  clinicalCapacityController.getAppointmentCapacityMetrics
);

router.get(
  "/recommendations",
  checkPermission("operations", "operations:recommendation_view"),
  clinicalCapacityController.getOperationalRecommendations
);

router.post(
  "/recommendations/:id/accept",
  checkPermission("operations", "operations:capacity_manage"),
  clinicalCapacityController.acceptRecommendation
);

router.get(
  "/throughput",
  checkPermission("operations", "operations:throughput_view"),
  clinicalCapacityController.getThroughputMetrics
);

router.get(
  "/executive-capacity",
  checkPermission("operations", "operations:capacity_view"),
  clinicalCapacityController.getExecutiveCapacityDashboard
);

router.post(
  "/resource-allocation",
  checkPermission("operations", "operations:resource_allocate"),
  clinicalCapacityController.allocateResource
);

router.put(
  "/resource-assignment",
  checkPermission("operations", "operations:resource_allocate"),
  clinicalCapacityController.releaseAssignment
);

router.get(
  "/assignments",
  checkPermission("operations", "operations:capacity_view"),
  clinicalCapacityController.getActiveAssignments
);

module.exports = router;
