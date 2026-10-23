"use strict";

const express = require("express");
const router = express.Router();

const regionalPlanController = require("../../controllers/plan/regionalPlanController");
const { authenticateToken, checkAnyPermission } = require("../../middlewares/authMiddleware");

// Permissions helpers
const planReadAccess = checkAnyPermission([
  { resource: "REGIONAL_PLANS", action: "READ" },
  { resource: "REGIONAL_PLANS", action: "MANAGE" },
  { resource: "REGIONS", action: "READ" },
  { resource: "REGIONS", action: "MANAGE" },
]);

const planCreateAccess = checkAnyPermission([
  { resource: "REGIONAL_PLANS", action: "CREATE" },
  { resource: "REGIONAL_PLANS", action: "MANAGE" },
  { resource: "REGIONS", action: "MANAGE" },
]);

const planUpdateAccess = checkAnyPermission([
  { resource: "REGIONAL_PLANS", action: "UPDATE" },
  { resource: "REGIONAL_PLANS", action: "MANAGE" },
  { resource: "REGIONS", action: "MANAGE" },
]);

const planDeleteAccess = checkAnyPermission([
  { resource: "REGIONAL_PLANS", action: "DELETE" },
  { resource: "REGIONAL_PLANS", action: "MANAGE" },
  { resource: "REGIONS", action: "MANAGE" },
]);

const planFinalizeAccess = checkAnyPermission([
  { resource: "REGIONAL_PLANS", action: "FINALIZE" },
  { resource: "REGIONAL_PLANS", action: "UPDATE" },
  { resource: "REGIONAL_PLANS", action: "MANAGE" },
  { resource: "REGIONS", action: "MANAGE" },
]);

const planExecuteAccess = checkAnyPermission([
  { resource: "REGIONAL_PLANS", action: "EXECUTE_ACHIEVEMENT" },
  { resource: "REGIONAL_PLANS", action: "UPDATE" },
  { resource: "REGIONAL_PLANS", action: "MANAGE" },
  { resource: "REGIONS", action: "MANAGE" },
]);

const planApproveAccess = checkAnyPermission([
  { resource: "REGIONAL_PLANS", action: "APPROVE_ACHIEVEMENT" },
  { resource: "REGIONAL_PLANS", action: "UPDATE" },
  { resource: "REGIONAL_PLANS", action: "MANAGE" },
  { resource: "REGIONS", action: "MANAGE" },
]);

const planValidateAccess = checkAnyPermission([
  { resource: "REGIONAL_PLANS", action: "VALIDATE_ACHIEVEMENT" },
  { resource: "REGIONAL_PLANS", action: "FINALIZE" },
  { resource: "REGIONAL_PLANS", action: "MANAGE" },
  { resource: "REGIONS", action: "MANAGE" },
]);

// All routes require authentication
router.use(authenticateToken);

// -------------------------------------------------------------
// 1. Planning Configurations & Rules
// -------------------------------------------------------------
router.get("/config", planReadAccess, regionalPlanController.getPlanningConfigHandler);
router.put("/config", planUpdateAccess, regionalPlanController.updatePlanningConfigHandler);

router.get("/rules", planReadAccess, regionalPlanController.listPlanRulesHandler);
router.post("/rules", planCreateAccess, regionalPlanController.createPlanRuleHandler);
router.get("/rules/:id", planReadAccess, regionalPlanController.getPlanRuleByIdHandler);
router.put("/rules/:id", planUpdateAccess, regionalPlanController.updatePlanRuleHandler);
router.delete("/rules/:id", planDeleteAccess, regionalPlanController.deletePlanRuleHandler);

// -------------------------------------------------------------
// 2. Execution Dashboard
// -------------------------------------------------------------
router.get("/dashboard/summary", planReadAccess, regionalPlanController.getExecutionDashboardSummaryHandler);
router.get("/dashboard/progress-tree", planReadAccess, regionalPlanController.getExecutionDashboardProgressTreeHandler);
router.get("/dashboard/department-user", planReadAccess, regionalPlanController.getExecutionDashboardDepartmentUserHandler);

// -------------------------------------------------------------
// 3. Plan Versions
// -------------------------------------------------------------
router.get("/versions", planReadAccess, regionalPlanController.listPlanVersionsHandler);
router.post("/versions", planCreateAccess, regionalPlanController.createPlanDraftHandler);
router.get("/versions/:id", planReadAccess, regionalPlanController.getPlanVersionByIdHandler);
router.put("/versions/:id", planUpdateAccess, regionalPlanController.updatePlanVersionHandler);
router.delete("/versions/:id", planDeleteAccess, regionalPlanController.deletePlanVersionHandler);
router.post("/versions/:id/duplicate", planCreateAccess, regionalPlanController.duplicatePlanDraftHandler);

// Lifecycle: Finalization & Start
router.get("/versions/:id/finalization-readiness", planReadAccess, regionalPlanController.getDraftFinalizationReadinessHandler);
router.post("/versions/:id/finalize", planFinalizeAccess, regionalPlanController.finalizePlanDraftHandler);
router.post("/versions/:id/reopen-for-edit", planUpdateAccess, regionalPlanController.reopenPlanDraftHandler);
router.get("/versions/:id/start-process-readiness", planReadAccess, regionalPlanController.getStartProcessReadinessHandler);
router.post("/versions/:id/start-process", planFinalizeAccess, regionalPlanController.startPlanProcessHandler);

// Annual Planning
router.get("/versions/:id/annual-versions", planReadAccess, regionalPlanController.listAnnualVersionsHandler);
router.get("/versions/:id/annual-target-allocations", planReadAccess, regionalPlanController.getAnnualTargetAllocationsHandler);
router.get("/versions/:id/annual-execution-readiness", planReadAccess, regionalPlanController.getAnnualExecutionReadinessHandler);
router.post("/versions/:id/finalize-annual-execution", planFinalizeAccess, regionalPlanController.finalizeAnnualExecutionHandler);
router.post("/versions/:id/lock-annual", planUpdateAccess, regionalPlanController.lockAnnualPlanHandler);
router.post("/versions/:id/unlock-annual", planUpdateAccess, regionalPlanController.unlockAnnualPlanHandler);
router.post("/versions/:id/complete-annual", planFinalizeAccess, regionalPlanController.completeAnnualPlanHandler);

// Period Planning
router.get("/versions/:id/execution-periods", planReadAccess, regionalPlanController.listExecutionPeriodsHandler);
router.post("/versions/:id/initialize-execution-periods", planUpdateAccess, regionalPlanController.initializeExecutionPeriodsHandler);
router.get("/versions/:id/period-target-allocations", planReadAccess, regionalPlanController.getPeriodTargetAllocationsHandler);
router.get("/versions/:id/execution-period-readiness", planReadAccess, regionalPlanController.getPeriodFinalizationReadinessHandler);
router.post("/versions/:id/finalize-execution-periods", planFinalizeAccess, regionalPlanController.finalizePeriodTargetsHandler);
router.post("/versions/:id/complete-period", planFinalizeAccess, regionalPlanController.completeExecutionPeriodHandler);

// Hierarchy
router.get("/versions/:id/hierarchy", planReadAccess, regionalPlanController.getPlanHierarchyHandler);

// -------------------------------------------------------------
// 4. Plan Nodes
// -------------------------------------------------------------
router.post("/nodes", planUpdateAccess, regionalPlanController.createPlanNodeHandler);
router.get("/nodes/:id", planReadAccess, regionalPlanController.getPlanNodeByIdHandler);
router.put("/nodes/:id", planUpdateAccess, regionalPlanController.updatePlanNodeHandler);
router.delete("/nodes/:id", planDeleteAccess, regionalPlanController.deletePlanNodeHandler);
router.post("/nodes/reorder", planUpdateAccess, regionalPlanController.reorderPlanNodesHandler);

// Target Updates
router.patch("/nodes/:id/annual-target", planUpdateAccess, regionalPlanController.updateAnnualTargetHandler);
router.patch("/nodes/:id/period-target", planUpdateAccess, regionalPlanController.updatePeriodTargetHandler);

// Actuals & Achievements
router.patch("/nodes/:id/period-actual", planExecuteAccess, regionalPlanController.updatePeriodActualHandler);
router.post("/nodes/:id/achievement/submit", planExecuteAccess, regionalPlanController.submitAchievementHandler);
router.post("/nodes/:id/achievement/approve", planApproveAccess, regionalPlanController.approveAchievementHandler);
router.post("/nodes/:id/achievement/reject", planApproveAccess, regionalPlanController.rejectAchievementHandler);
router.post("/nodes/:id/achievement/validate", planValidateAccess, regionalPlanController.validateAchievementHandler);
router.post("/nodes/:id/achievement/validation-reject", planValidateAccess, regionalPlanController.rejectValidationAchievementHandler);

// Annual Achievements
router.post("/nodes/:id/annual-achievement/submit", planExecuteAccess, regionalPlanController.submitAnnualAchievementHandler);
router.post("/nodes/:id/annual-achievement/approve", planApproveAccess, regionalPlanController.approveAnnualAchievementHandler);
router.post("/nodes/:id/annual-achievement/reject", planApproveAccess, regionalPlanController.rejectAnnualAchievementHandler);
router.post("/nodes/:id/annual-achievement/validate", planValidateAccess, regionalPlanController.validateAnnualAchievementHandler);

module.exports = router;
