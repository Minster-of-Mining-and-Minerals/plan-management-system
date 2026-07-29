"use strict";

const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

// 1. Executive Healthcare Overview & Enterprise KPIs
router.get(
  "/overview",
  checkPermission("dashboard", "view"),
  dashboardController.getExecutiveOverview
);

// 2. Active Encounter Pipeline
router.get(
  "/pipeline",
  checkPermission("dashboard", "view"),
  dashboardController.getEncounterPipeline
);

// 3. Enterprise Queue Monitoring
router.get(
  "/queues",
  checkPermission("dashboard", "view"),
  dashboardController.getQueueMonitoring
);

// 4. Doctor Productivity Analytics
router.get(
  "/doctor-productivity",
  checkPermission("dashboard", "view"),
  dashboardController.getDoctorProductivity
);

// 5. Nurse Workload & Triage Metrics
router.get(
  "/nurse-metrics",
  checkPermission("dashboard", "view"),
  dashboardController.getNurseMetrics
);

// 6. Laboratory Intelligence
router.get(
  "/laboratory-intelligence",
  checkPermission("dashboard", "view"),
  dashboardController.getLaboratoryIntelligence
);

// 7. Radiology Intelligence
router.get(
  "/radiology-intelligence",
  checkPermission("dashboard", "view"),
  dashboardController.getRadiologyIntelligence
);

// 8. Pharmacy Intelligence
router.get(
  "/pharmacy-intelligence",
  checkPermission("dashboard", "view"),
  dashboardController.getPharmacyIntelligence
);

// 9. Financial Executive Analytics
router.get(
  "/financial-executive",
  checkPermission("dashboard", "view"),
  dashboardController.getFinancialExecutive
);

// 10. Department Performance Analytics
router.get(
  "/departments",
  checkPermission("dashboard", "view"),
  dashboardController.getDepartmentPerformance
);

// 11. Diagnosis Intelligence
router.get(
  "/diagnosis-intelligence",
  checkPermission("dashboard", "view"),
  dashboardController.getDiagnosisIntelligence
);

// 12. Clinical Order Intelligence
router.get(
  "/order-intelligence",
  checkPermission("dashboard", "view"),
  dashboardController.getClinicalOrderIntelligence
);

// 13. Care Continuity Analytics
router.get(
  "/care-continuity",
  checkPermission("dashboard", "view"),
  dashboardController.getCareContinuity
);

// 14. Timeline Intelligence Event Feed
router.get(
  "/timeline-intelligence",
  checkPermission("dashboard", "view"),
  dashboardController.getTimelineIntelligence
);

// 15. Geographic & Facility Statistics
router.get(
  "/facility-stats",
  checkPermission("dashboard", "view"),
  dashboardController.getFacilityStats
);

// 17. Drill-down raw dataset query endpoint
router.get(
  "/drilldown/:metricKey",
  checkPermission("dashboard", "view"),
  dashboardController.getDrillDownRecords
);

// Real-Time Operational Aliased Endpoint
router.get(
  "/operational",
  checkPermission("dashboard", "view"),
  dashboardController.getOperationalDashboard
);

// Clinical Analytics Aliased Endpoint
router.get(
  "/clinical",
  checkPermission("dashboard", "view"),
  dashboardController.getClinicalAnalytics
);

// Financial Analytics Aliased Endpoint
router.get(
  "/financial",
  checkPermission("dashboard", "view"),
  dashboardController.getFinancialAnalytics
);

// Role-Tailored Dashboard View
router.get(
  "/role-view",
  checkPermission("dashboard", "view"),
  dashboardController.getRoleViewDashboard
);

// Legacy/Backward Compatible Stats & Summary
router.get(
  "/stats",
  checkPermission("dashboard", "view"),
  dashboardController.getDashboardStats
);

module.exports = router;
