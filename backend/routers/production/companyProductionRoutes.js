"use strict";

const express = require("express");
const router = express.Router();

const companyProductionController = require("../../controllers/production/companyProductionController");
const { authenticateToken, checkAnyPermission } = require("../../middlewares/authMiddleware");

// Permissions
const assignmentReadAccess = checkAnyPermission([
  { resource: "company_production", action: "read" },
  { resource: "company_production", action: "manage" },
  { resource: "company_production", action: "assign" },
]);

const assignmentManageAccess = checkAnyPermission([
  { resource: "company_production", action: "assign" },
  { resource: "company_production", action: "manage" },
]);

const targetManageAccess = checkAnyPermission([
  { resource: "company_production_targets", action: "create" },
  { resource: "company_production_targets", action: "update" },
  { resource: "company_production_targets", action: "manage" },
]);

const targetReadAccess = checkAnyPermission([
  { resource: "company_production_targets", action: "read" },
  { resource: "company_production_targets", action: "manage" },
  { resource: "company_production", action: "read" },
]);

const targetReviewAccess = checkAnyPermission([
  { resource: "company_production_targets", action: "approve" },
  { resource: "company_production_targets", action: "manage" },
]);

const responsibilityAccess = checkAnyPermission([
  { resource: "company_production_responsibilities", action: "manage" },
  { resource: "company_production_responsibilities", action: "create" },
  { resource: "company_production_responsibilities", action: "update" },
  { resource: "company_production", action: "manage" },
]);

const reportSubmitAccess = checkAnyPermission([
  { resource: "company_production_reports", action: "create" },
  { resource: "company_production_reports", action: "update" },
  { resource: "company_production_reports", action: "manage" },
]);

const reportReadAccess = checkAnyPermission([
  { resource: "company_production_reports", action: "read" },
  { resource: "company_production_reports", action: "manage" },
  { resource: "company_production", action: "read" },
]);

const reportReviewAccess = checkAnyPermission([
  { resource: "company_production_reports", action: "approve" },
  { resource: "company_production_reports", action: "manage" },
]);

const dashboardReadAccess = checkAnyPermission([
  { resource: "production_dashboard", action: "read" },
  { resource: "company_production", action: "read" },
]);

// All routes require authentication
router.use(authenticateToken);

// -------------------------------------------------------------
// 1. Dashboards & Analytics
// -------------------------------------------------------------
router.get("/dashboard/federal", dashboardReadAccess, companyProductionController.getFederalDashboardHandler);
router.get(
  ["/dashboard/company", "/dashboard/company/:companyId"],
  dashboardReadAccess,
  companyProductionController.getCompanyDashboardHandler
);
router.get("/performance", dashboardReadAccess, companyProductionController.getPerformanceHandler);

// -------------------------------------------------------------
// 2. Company Assignments & Target Hierarchies
// -------------------------------------------------------------
router.get("/assignments", assignmentReadAccess, companyProductionController.listAssignmentsHandler);
router.post("/assignments", assignmentManageAccess, companyProductionController.createAssignmentHandler);
router.get("/assignments/:id", assignmentReadAccess, companyProductionController.getAssignmentByIdHandler);
router.get("/assignments/:id/detail", assignmentReadAccess, companyProductionController.getProductionDetailHandler);
router.put("/assignments/:id", assignmentManageAccess, companyProductionController.updateAssignmentHandler);

router.post("/assignments/:id/targets", targetManageAccess, companyProductionController.saveTargetHierarchyHandler);
router.get("/assignments/:id/targets", targetReadAccess, companyProductionController.getTargetsByAssignmentHandler);

// Target Proposal, Submission & Federal Review Lifecycle
router.post("/assignments/:id/propose-targets", targetManageAccess, companyProductionController.saveTargetProposalHandler);
router.post("/assignments/:id/submit-targets", targetManageAccess, companyProductionController.submitTargetProposalHandler);
router.post("/assignments/:id/review-targets", targetReviewAccess, companyProductionController.reviewTargetProposalHandler);
router.get("/assignments/:id/approval-history", targetReadAccess, companyProductionController.getApprovalHistoryHandler);

// Reporting Responsibilities (Department, User, Role)
router.get("/assignments/:id/responsibilities", assignmentReadAccess, companyProductionController.listResponsibilitiesHandler);
router.post("/assignments/:id/responsibilities", responsibilityAccess, companyProductionController.manageResponsibilitiesHandler);

// -------------------------------------------------------------
// 3. Company Production Reports
// -------------------------------------------------------------
router.get("/reports", reportReadAccess, companyProductionController.listReportsHandler);
router.post("/reports", reportSubmitAccess, companyProductionController.submitReportHandler);
router.get("/reports/:id", reportReadAccess, companyProductionController.getReportByIdHandler);
router.put("/reports/:id", reportSubmitAccess, companyProductionController.updateReportHandler);
router.post("/reports/:id/review", reportReviewAccess, companyProductionController.reviewReportHandler);

module.exports = router;
