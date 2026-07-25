"use strict";

const express = require("express");
const router = express.Router();
const radiologyController = require("../controllers/radiologyController");
const radiologyQueueController = require("../controllers/radiologyQueueController");
const radiologyImageController = require("../controllers/radiologyImageController");
const radiologyReviewController = require("../controllers/radiologyReviewController");
const radiologyBillingController = require("../controllers/radiologyBillingController");
const radiologyAnalyticsController = require("../controllers/radiologyAnalyticsController");
const radiologyTemplateController = require("../controllers/radiologyTemplateController");
const radiologyCriticalAlertController = require("../controllers/radiologyCriticalAlertController");
const radiologyResourceController = require("../controllers/radiologyResourceController");
const radiologyExternalStudyController = require("../controllers/radiologyExternalStudyController");

const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

// ================= DICOM Web Viewer Session Routes =================
router.post(
  "/images/:id/viewer-session",
  checkPermission("radiology", "open_viewer"),
  radiologyImageController.generateViewerSession ? radiologyImageController.generateViewerSession.bind(radiologyImageController) : (req, res) => res.json({ success: true })
);

router.get(
  "/studies/:id/viewer",
  checkPermission("radiology", "open_viewer"),
  radiologyImageController.getStudyViewer ? radiologyImageController.getStudyViewer.bind(radiologyImageController) : (req, res) => res.json({ success: true })
);

// ================= Structured Reporting Template Routes =================
router.post(
  "/templates",
  checkPermission("radiology", "manage_templates"),
  radiologyTemplateController.createTemplate.bind(radiologyTemplateController)
);

router.get(
  "/templates/match",
  checkPermission("radiology", "view"),
  radiologyTemplateController.getTemplateForProcedure.bind(radiologyTemplateController)
);

router.get(
  "/templates/:id",
  checkPermission("radiology", "view"),
  radiologyTemplateController.getTemplate.bind(radiologyTemplateController)
);

router.patch(
  "/reports/:id/template",
  checkPermission("radiology", "report_create"),
  radiologyTemplateController.applyTemplateToReport.bind(radiologyTemplateController)
);

// ================= Critical Result Communication Routes =================
router.post(
  "/critical-alerts",
  checkPermission("radiology", "critical_alert_manage"),
  radiologyCriticalAlertController.createAlert.bind(radiologyCriticalAlertController)
);

router.patch(
  "/critical-alerts/:id/assign",
  checkPermission("radiology", "critical_alert_manage"),
  radiologyCriticalAlertController.assignRecipient.bind(radiologyCriticalAlertController)
);

router.patch(
  "/critical-alerts/:id/acknowledge",
  checkPermission("radiology", "critical_alert_acknowledge"),
  radiologyCriticalAlertController.acknowledgeAlert.bind(radiologyCriticalAlertController)
);

router.patch(
  "/critical-alerts/:id/close",
  checkPermission("radiology", "critical_alert_manage"),
  radiologyCriticalAlertController.closeAlert.bind(radiologyCriticalAlertController)
);

router.get(
  "/studies/:id/critical-alerts",
  checkPermission("radiology", "view"),
  radiologyCriticalAlertController.getStudyAlerts.bind(radiologyCriticalAlertController)
);

// ================= Equipment Resource Scheduling Routes =================
router.post(
  "/resources",
  checkPermission("radiology", "resource_manage"),
  radiologyResourceController.createResource.bind(radiologyResourceController)
);

router.get(
  "/resources",
  checkPermission("radiology", "view"),
  radiologyResourceController.listResources.bind(radiologyResourceController)
);

router.get(
  "/resources/:id/slots",
  checkPermission("radiology", "view"),
  radiologyResourceController.findAvailableSlots.bind(radiologyResourceController)
);

router.post(
  "/resources/:id/reserve",
  checkPermission("radiology", "resource_manage"),
  radiologyResourceController.reserveResource.bind(radiologyResourceController)
);

router.delete(
  "/resources/reservations/:id",
  checkPermission("radiology", "resource_manage"),
  radiologyResourceController.releaseResource.bind(radiologyResourceController)
);

// ================= External Imaging Study Import Routes =================
router.post(
  "/external-studies",
  checkPermission("radiology", "external_import"),
  radiologyExternalStudyController.importStudy.bind(radiologyExternalStudyController)
);

router.patch(
  "/external-studies/:id/report",
  checkPermission("radiology", "external_import"),
  radiologyExternalStudyController.attachExternalReport.bind(radiologyExternalStudyController)
);

router.post(
  "/external-studies/:id/timeline",
  checkPermission("radiology", "external_import"),
  radiologyExternalStudyController.linkToPatientTimeline.bind(radiologyExternalStudyController)
);

router.get(
  "/patients/:patientId/external-studies",
  checkPermission("radiology", "view"),
  radiologyExternalStudyController.listPatientExternalStudies.bind(radiologyExternalStudyController)
);

// ================= Analytics Routes =================
router.get(
  "/analytics/overview",
  checkPermission("radiology", "analytics_view"),
  radiologyAnalyticsController.getOverviewMetrics.bind(radiologyAnalyticsController)
);

router.get(
  "/analytics/modality",
  checkPermission("radiology", "analytics_view"),
  radiologyAnalyticsController.getModalityStats.bind(radiologyAnalyticsController)
);

router.get(
  "/analytics/performance",
  checkPermission("radiology", "analytics_view"),
  radiologyAnalyticsController.getPerformanceMetrics.bind(radiologyAnalyticsController)
);

// ================= Work Queue Routes =================
router.get(
  "/workqueue",
  checkPermission("radiology", "view_queue"),
  radiologyQueueController.getQueue.bind(radiologyQueueController)
);

router.get(
  "/workqueue/my",
  checkPermission("radiology", "view_queue"),
  radiologyQueueController.getMyWorklist.bind(radiologyQueueController)
);

router.patch(
  "/workqueue/:id/claim",
  checkPermission("radiology", "claim_work"),
  radiologyQueueController.claimQueueItem.bind(radiologyQueueController)
);

router.patch(
  "/workqueue/:id/start",
  checkPermission("radiology", "claim_work"),
  radiologyQueueController.startQueueItem.bind(radiologyQueueController)
);

router.patch(
  "/workqueue/:id/complete",
  checkPermission("radiology", "claim_work"),
  radiologyQueueController.completeQueueItem.bind(radiologyQueueController)
);

// ================= Procedure Catalog Routes =================
router.post(
  "/procedures",
  checkPermission("radiology", "perform"),
  radiologyController.createProcedureCatalog.bind(radiologyController)
);

router.get(
  "/procedures",
  checkPermission("radiology", "view"),
  radiologyController.listProcedureCatalog.bind(radiologyController)
);

// ================= Imaging Study Lifecycle Routes =================
router.get(
  "/studies",
  checkPermission("radiology", "view"),
  radiologyController.listStudies.bind(radiologyController)
);

router.post(
  "/orders/:orderId/study",
  checkPermission("radiology", "schedule"),
  radiologyController.createStudy.bind(radiologyController)
);

router.get(
  "/studies/:id",
  checkPermission("radiology", "view"),
  radiologyController.getStudy.bind(radiologyController)
);

router.patch(
  "/studies/:id/schedule",
  checkPermission("radiology", "schedule"),
  radiologyController.scheduleStudy.bind(radiologyController)
);

router.patch(
  "/studies/:id/start",
  checkPermission("radiology", "perform"),
  radiologyController.startStudy.bind(radiologyController)
);

router.patch(
  "/studies/:id/complete",
  checkPermission("radiology", "perform"),
  radiologyController.completeAcquisition.bind(radiologyController)
);

// ================= PACS / DICOM Imaging Routes =================
router.post(
  "/images",
  checkPermission("radiology", "pacs_manage"),
  radiologyImageController.registerImage.bind(radiologyImageController)
);

router.post(
  "/series",
  checkPermission("radiology", "pacs_manage"),
  radiologyImageController.registerSeries.bind(radiologyImageController)
);

router.post(
  "/studies/:id/images",
  checkPermission("radiology", "pacs_manage"),
  radiologyImageController.attachImageToStudy.bind(radiologyImageController)
);

router.get(
  "/studies/:id/images",
  checkPermission("radiology", "pacs_view"),
  radiologyImageController.getStudyImages.bind(radiologyImageController)
);

router.get(
  "/images/:id/viewer",
  checkPermission("radiology", "pacs_view"),
  radiologyImageController.generateViewerLink.bind(radiologyImageController)
);

// ================= Diagnostic Report Routes =================
router.post(
  "/studies/:id/report",
  checkPermission("radiology", "report_create"),
  radiologyController.submitReport.bind(radiologyController)
);

router.patch(
  "/reports/:id/verify",
  checkPermission("radiology", "report_verify"),
  radiologyController.verifyReport.bind(radiologyController)
);

router.patch(
  "/reports/:id/amend",
  checkPermission("radiology", "report_amend"),
  radiologyController.amendReport.bind(radiologyController)
);

router.patch(
  "/reports/:id/release",
  checkPermission("radiology", "release_patient"),
  radiologyController.releaseReportToPatient.bind(radiologyController)
);

router.patch(
  "/reports/:id/withhold",
  checkPermission("radiology", "release_patient"),
  radiologyController.withholdReportFromPatient.bind(radiologyController)
);

// ================= Clinical Physician Review Routes =================
router.post(
  "/studies/:id/review/assign",
  checkPermission("radiology", "review_clinical"),
  radiologyReviewController.assignReview.bind(radiologyReviewController)
);

router.patch(
  "/reviews/:id/complete",
  checkPermission("radiology", "review_clinical"),
  radiologyReviewController.completeReview.bind(radiologyReviewController)
);

router.patch(
  "/reviews/:id/decision",
  checkPermission("radiology", "review_clinical"),
  radiologyReviewController.recordDecision.bind(radiologyReviewController)
);

router.get(
  "/studies/:id/reviews",
  checkPermission("radiology", "review_clinical"),
  radiologyReviewController.getStudyReviews.bind(radiologyReviewController)
);

// ================= Finance & Billing Integration Routes =================
router.post(
  "/studies/:id/billing/charge",
  checkPermission("radiology", "billing_manage"),
  radiologyBillingController.createRadiologyCharge.bind(radiologyBillingController)
);

router.patch(
  "/studies/:id/billing/cancel",
  checkPermission("radiology", "billing_manage"),
  radiologyBillingController.cancelRadiologyCharge.bind(radiologyBillingController)
);

router.get(
  "/studies/:id/billing/verify",
  checkPermission("radiology", "billing_manage"),
  radiologyBillingController.verifyCharge.bind(radiologyBillingController)
);

module.exports = router;
