"use strict";

const express = require("express");
const router = express.Router();

const companyPlanController = require("../../controllers/plan/companyPlanController");
const { authenticateToken, checkAnyPermission } = require("../../middlewares/authMiddleware");

// Permissions helpers
const planReadAccess = checkAnyPermission([
  { resource: "COMPANY_PLANS", action: "READ" },
  { resource: "COMPANY_PLANS", action: "MANAGE" },
  { resource: "COMPANIES", action: "READ" },
  { resource: "COMPANIES", action: "MANAGE" },
]);

const planCreateAccess = checkAnyPermission([
  { resource: "COMPANY_PLANS", action: "CREATE" },
  { resource: "COMPANY_PLANS", action: "MANAGE" },
  { resource: "COMPANIES", action: "MANAGE" },
]);

const planUpdateAccess = checkAnyPermission([
  { resource: "COMPANY_PLANS", action: "UPDATE" },
  { resource: "COMPANY_PLANS", action: "MANAGE" },
  { resource: "COMPANIES", action: "MANAGE" },
]);

const planDeleteAccess = checkAnyPermission([
  { resource: "COMPANY_PLANS", action: "DELETE" },
  { resource: "COMPANY_PLANS", action: "MANAGE" },
  { resource: "COMPANIES", action: "MANAGE" },
]);

const planFinalizeAccess = checkAnyPermission([
  { resource: "COMPANY_PLANS", action: "FINALIZE" },
  { resource: "COMPANY_PLANS", action: "UPDATE" },
  { resource: "COMPANY_PLANS", action: "MANAGE" },
  { resource: "COMPANIES", action: "MANAGE" },
]);

const planExecuteAccess = checkAnyPermission([
  { resource: "COMPANY_PLANS", action: "EXECUTE_ACHIEVEMENT" },
  { resource: "COMPANY_PLANS", action: "UPDATE" },
  { resource: "COMPANY_PLANS", action: "MANAGE" },
  { resource: "COMPANIES", action: "MANAGE" },
]);

const planApproveAccess = checkAnyPermission([
  { resource: "COMPANY_PLANS", action: "APPROVE_ACHIEVEMENT" },
  { resource: "COMPANY_PLANS", action: "UPDATE" },
  { resource: "COMPANY_PLANS", action: "MANAGE" },
  { resource: "COMPANIES", action: "MANAGE" },
]);

const planValidateAccess = checkAnyPermission([
  { resource: "COMPANY_PLANS", action: "VALIDATE_ACHIEVEMENT" },
  { resource: "COMPANY_PLANS", action: "FINALIZE" },
  { resource: "COMPANY_PLANS", action: "MANAGE" },
  { resource: "COMPANIES", action: "MANAGE" },
]);

// All routes require authentication
router.use(authenticateToken);

// -------------------------------------------------------------
// 1. Planning Configurations & Rules
// -------------------------------------------------------------
router.get("/config", planReadAccess, companyPlanController.getPlanningConfigHandler);
router.put("/config", planUpdateAccess, companyPlanController.updatePlanningConfigHandler);

router.get("/rules", planReadAccess, companyPlanController.listPlanRulesHandler);
router.post("/rules", planCreateAccess, companyPlanController.createPlanRuleHandler);
router.get("/rules/:id", planReadAccess, companyPlanController.getPlanRuleByIdHandler);
router.put("/rules/:id", planUpdateAccess, companyPlanController.updatePlanRuleHandler);
router.delete("/rules/:id", planDeleteAccess, companyPlanController.deletePlanRuleHandler);

// -------------------------------------------------------------
// 2. Execution Dashboard
// -------------------------------------------------------------
router.get("/dashboard/summary", planReadAccess, companyPlanController.getExecutionDashboardSummaryHandler);
router.get("/dashboard/progress-tree", planReadAccess, companyPlanController.getExecutionDashboardProgressTreeHandler);
router.get("/dashboard/department-user", planReadAccess, companyPlanController.getExecutionDashboardDepartmentUserHandler);

// -------------------------------------------------------------
// 3. Plan Versions
// -------------------------------------------------------------
router.get("/versions", planReadAccess, companyPlanController.listPlanVersionsHandler);
router.post("/versions", planCreateAccess, companyPlanController.createPlanDraftHandler);
router.get("/versions/:id", planReadAccess, companyPlanController.getPlanVersionByIdHandler);
router.put("/versions/:id", planUpdateAccess, companyPlanController.updatePlanVersionHandler);
router.delete("/versions/:id", planDeleteAccess, companyPlanController.deletePlanVersionHandler);
router.post("/versions/:id/duplicate", planCreateAccess, companyPlanController.duplicatePlanDraftHandler);

// Lifecycle: Finalization & Start
router.get("/versions/:id/finalization-readiness", planReadAccess, companyPlanController.getDraftFinalizationReadinessHandler);
router.post("/versions/:id/finalize", planFinalizeAccess, companyPlanController.finalizePlanDraftHandler);
router.post("/versions/:id/reopen-for-edit", planUpdateAccess, companyPlanController.reopenPlanDraftHandler);
router.get("/versions/:id/start-process-readiness", planReadAccess, companyPlanController.getStartProcessReadinessHandler);
router.post("/versions/:id/start-process", planFinalizeAccess, companyPlanController.startPlanProcessHandler);

// Annual Planning
router.get("/versions/:id/annual-versions", planReadAccess, companyPlanController.listAnnualVersionsHandler);
router.get("/versions/:id/annual-target-allocations", planReadAccess, companyPlanController.getAnnualTargetAllocationsHandler);
router.get("/versions/:id/annual-execution-readiness", planReadAccess, companyPlanController.getAnnualExecutionReadinessHandler);
router.post("/versions/:id/finalize-annual-execution", planFinalizeAccess, companyPlanController.finalizeAnnualExecutionHandler);
router.post("/versions/:id/lock-annual", planUpdateAccess, companyPlanController.lockAnnualPlanHandler);
router.post("/versions/:id/unlock-annual", planUpdateAccess, companyPlanController.unlockAnnualPlanHandler);
router.post("/versions/:id/complete-annual", planFinalizeAccess, companyPlanController.completeAnnualPlanHandler);

// Period Planning
router.get("/versions/:id/execution-periods", planReadAccess, companyPlanController.listExecutionPeriodsHandler);
router.post("/versions/:id/initialize-execution-periods", planUpdateAccess, companyPlanController.initializeExecutionPeriodsHandler);
router.get("/versions/:id/period-target-allocations", planReadAccess, companyPlanController.getPeriodTargetAllocationsHandler);
router.get("/versions/:id/execution-period-readiness", planReadAccess, companyPlanController.getPeriodFinalizationReadinessHandler);
router.post("/versions/:id/finalize-execution-periods", planFinalizeAccess, companyPlanController.finalizePeriodTargetsHandler);
router.post("/versions/:id/complete-period", planFinalizeAccess, companyPlanController.completeExecutionPeriodHandler);

// Hierarchy
router.get("/versions/:id/hierarchy", planReadAccess, companyPlanController.getPlanHierarchyHandler);

// -------------------------------------------------------------
// 4. Plan Nodes
// -------------------------------------------------------------
router.post("/nodes", planUpdateAccess, companyPlanController.createPlanNodeHandler);
router.get("/nodes/:id", planReadAccess, companyPlanController.getPlanNodeByIdHandler);
router.put("/nodes/:id", planUpdateAccess, companyPlanController.updatePlanNodeHandler);
router.delete("/nodes/:id", planDeleteAccess, companyPlanController.deletePlanNodeHandler);
router.post("/nodes/reorder", planUpdateAccess, companyPlanController.reorderPlanNodesHandler);

// Target Updates
router.patch("/nodes/:id/annual-target", planUpdateAccess, companyPlanController.updateAnnualTargetHandler);
router.patch("/nodes/:id/period-target", planUpdateAccess, companyPlanController.updatePeriodTargetHandler);

// Actuals & Achievements
router.patch("/nodes/:id/period-actual", planExecuteAccess, companyPlanController.updatePeriodActualHandler);
router.post("/nodes/:id/achievement/submit", planExecuteAccess, companyPlanController.submitAchievementHandler);
router.post("/nodes/:id/achievement/approve", planApproveAccess, companyPlanController.approveAchievementHandler);
router.post("/nodes/:id/achievement/reject", planApproveAccess, companyPlanController.rejectAchievementHandler);
router.post("/nodes/:id/achievement/validate", planValidateAccess, companyPlanController.validateAchievementHandler);
router.post("/nodes/:id/achievement/validation-reject", planValidateAccess, companyPlanController.rejectValidationAchievementHandler);

// Annual Achievements
router.post("/nodes/:id/annual-achievement/submit", planExecuteAccess, companyPlanController.submitAnnualAchievementHandler);
router.post("/nodes/:id/annual-achievement/approve", planApproveAccess, companyPlanController.approveAnnualAchievementHandler);
router.post("/nodes/:id/annual-achievement/reject", planApproveAccess, companyPlanController.rejectAnnualAchievementHandler);
router.post("/nodes/:id/annual-achievement/validate", planValidateAccess, companyPlanController.validateAnnualAchievementHandler);

module.exports = router;
