const express = require("express");
const router = express.Router();

const {
    validateCreatePlanVersion,
    validateUpdatePlanVersion,
    validateUpdatePlanVersionStatus,
    validateDuplicatePlanDraft,
    validateGetPlanVersionsQuery,
    validateGetPlanExecutionDashboardQuery,
    validateCreatePlanNode,
    validateUpdatePlanNode,
    validateGetPlanNodesQuery,
    validateReorderPlanNodes,
    validateIdParam,
    validateVersionIdParam,
    validateUpdateAnnualTarget,
    validateUpdatePeriodTarget,
    validateUpdatePeriodActual,
    validateSubmitAchievement,
    validateSubmitAnnualAchievement,
    validateRejectAchievement,
} = require("../../validators/plan/planValidator");

const { getExecutionDashboard } = require("../../controllers/plan/planDashboardController");

const {
    createPlanVersion,
    getPlanVersions,
    getPlanVersionsForReview,
    getPlanVersionById,
    updatePlanVersion,
    deletePlanVersion,
    updatePlanVersionStatus,
    createPlanNode,
    getPlanNodes,
    getPlanNodeById,
    updatePlanNode,
    deletePlanNode,
    getPlanHierarchy,
    reorderPlanNodes,
} = require("../../controllers/plan/planController");

const {
    getDraftFinalizationReadiness,
    finalizePlanDraft,
    listAnnualVersions,
    getAnnualExecutionFinalizationReadiness,
    finalizeAnnualExecutionPlan,
    lockAnnualPlanVersion,
    unlockAnnualPlanVersion,
    updateAnnualTarget,
    completeAnnualPlanVersion,
    listExecutionPeriods,
    initializeExecutionPeriodsForAnnual,
    listAnnualTargetAllocations,
    getExecutionPeriodFinalizationReadinessHandler,
    finalizeExecutionPeriodTargetsHandler,
    listPeriodTargetAllocations,
    getGlobalPeriodTargetFinalizationReadinessHandler,
    finalizeGlobalPeriodTargetsHandler,
    getStartProcessReadinessHandler,
    startPlanProcessHandler,
    getExecutionAccessHandler,
    completeExecutionPeriodVersion,
    reopenFinalizedPlanForEditHandler,
    duplicatePlanDraftHandler,
} = require("../../controllers/plan/planVersionLifecycleController");

const {
    updatePeriodTarget,
    updatePeriodActual,
    submitAchievementHandler,
    approveAchievementHandler,
    validateAchievementHandler,
    rejectValidationAchievementHandler,
    rejectAchievementHandler,
    submitAnnualAchievementHandler,
    approveAnnualAchievementHandler,
    validateAnnualAchievementHandler,
    rejectAnnualAchievementHandler,
    rejectValidationAnnualAchievementHandler,
    getAchievementWorkflowScope,
    listSectorAggregationPublishStateHandler,
    publishSectorAggregationHandler,
    rejectSectorAggregationPublishHandler,
} = require("../../controllers/plan/planAchievementController");

const {
    getPublishForReviewReadinessHandler,
    publishForReviewHandler,
    unlockForCorrectionsHandler,
    republishForReviewHandler,
    getCompleteReviewReadinessHandler,
    completeReviewHandler,
    getPlanReviewDashboardHandler,
} = require("../../controllers/plan/planReviewController");

const {
    getPlanRules,
    getPlanRuleById,
    getPlanRuleForVersion,
    updatePlanRuleForVersion,
    createPlanRule,
    updatePlanRule,
    deletePlanRule,
} = require("../../controllers/plan/planRuleController");

const {
    validateCreatePlanRule,
    validateUpdatePlanRule,
    validateIdParam: validateRuleIdParam,
} = require("../../validators/plan/planRuleValidator");

const {
    validateUpdatePlanningConfiguration,
} = require("../../validators/plan/planningConfigurationValidator");

const {
    getPlanningConfiguration,
    getPlanningConfigurationForVersion,
    updatePlanningConfiguration,
    updatePlanningConfigurationForVersion,
    restoreDefaultPlanningConfiguration,
} = require("../../controllers/plan/planningConfigurationController");

const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");
const {
    requirePlanVersionReadAccess,
    requirePlanNodeReadAccess,
    requirePlanVersionReadAccessFromQuery,
} = require("../../middlewares/planReadAccessMiddleware");

const planStructureMutation = checkAnyPermission([
    { resource: "PLANS", action: "UPDATE" },
    { resource: "PLANS", action: "EDIT_FINALIZED" },
]);

const planReadAccess = checkAnyPermission([
    { resource: "PLANS", action: "READ" },
    { resource: "PLAN", action: "VIEW_ASSIGNED_REVIEW" },
]);

const planRulesListAccess = checkAnyPermission([
    { resource: "PLAN_RULES", action: "READ" },
    { resource: "PLANS", action: "UPDATE" },
]);

// Apply authentication to all routes
router.use(authenticateToken);

// ================= PLAN VERSIONS =================

router.post("/versions", checkPermission("PLAN", "DRAFT_PUBLISH"), validateCreatePlanVersion, createPlanVersion);
router.post(
    "/versions/:id/duplicate",
    checkPermission("PLAN", "DRAFT_PUBLISH"),
    validateIdParam,
    validateDuplicatePlanDraft,
    duplicatePlanDraftHandler
);
router.get("/versions", checkPermission("PLANS", "READ"), validateGetPlanVersionsQuery, getPlanVersions);
router.get(
    "/execution-dashboard",
    checkPermission("PLANS", "READ"),
    validateGetPlanExecutionDashboardQuery,
    getExecutionDashboard
);
router.get(
    "/versions/for-review",
    checkPermission("PLAN", "VIEW_ASSIGNED_REVIEW"),
    validateGetPlanVersionsQuery,
    getPlanVersionsForReview
);
router.get("/versions/:id", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), getPlanVersionById);
router.put("/versions/:id", checkPermission("PLANS", "UPDATE"), validateIdParam, validateUpdatePlanVersion, updatePlanVersion);
router.delete("/versions/:id", checkPermission("PLANS", "DELETE"), validateIdParam, deletePlanVersion);
router.patch("/versions/:id/status", checkPermission("PLANS", "APPROVE"), validateIdParam, validateUpdatePlanVersionStatus, updatePlanVersionStatus);

router.get("/versions/:id/finalization-readiness", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), getDraftFinalizationReadiness);
router.post("/versions/:id/finalize", checkPermission("PLAN", "FINALIZE"), validateIdParam, finalizePlanDraft);
router.post(
    "/versions/:id/reopen-for-edit",
    checkPermission("PLANS", "EDIT_FINALIZED"),
    validateIdParam,
    reopenFinalizedPlanForEditHandler
);
router.get("/versions/:id/annual-versions", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), listAnnualVersions);
router.get("/versions/:id/annual-target-allocations", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), listAnnualTargetAllocations);
router.get("/versions/:id/annual-execution-readiness", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), getAnnualExecutionFinalizationReadiness);
router.post("/versions/:id/finalize-annual-execution", checkPermission("PLAN", "FINALIZE"), validateIdParam, finalizeAnnualExecutionPlan);
router.post("/versions/:id/lock-annual", checkPermission("PLANS", "UPDATE"), validateIdParam, lockAnnualPlanVersion);
router.post("/versions/:id/unlock-annual", checkPermission("PLANS", "UPDATE"), validateIdParam, unlockAnnualPlanVersion);
router.post("/versions/:id/complete-annual", checkPermission("PLAN", "COMPLETE_ANNUAL"), validateIdParam, completeAnnualPlanVersion);
router.get("/versions/:id/execution-periods", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), listExecutionPeriods);
router.post("/versions/:id/initialize-execution-periods", checkPermission("PLANS", "UPDATE"), validateIdParam, initializeExecutionPeriodsForAnnual);
router.get("/versions/:id/execution-period-readiness", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), getExecutionPeriodFinalizationReadinessHandler);
router.post("/versions/:id/finalize-execution-periods", checkPermission("PLAN", "FINALIZE"), validateIdParam, finalizeExecutionPeriodTargetsHandler);
router.post("/versions/:id/complete-period", checkPermission("PLAN", "COMPLETE_PERIOD"), validateIdParam, completeExecutionPeriodVersion);
router.get("/versions/:id/period-target-allocations", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), listPeriodTargetAllocations);
router.get("/versions/:id/global-period-target-readiness", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), getGlobalPeriodTargetFinalizationReadinessHandler);
router.post("/versions/:id/finalize-global-period-targets", checkPermission("PLAN", "FINALIZE"), validateIdParam, finalizeGlobalPeriodTargetsHandler);
router.get("/versions/:id/start-process-readiness", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), getStartProcessReadinessHandler);
router.post("/versions/:id/start-process", checkPermission("PLAN", "START_PROCESS"), validateIdParam, startPlanProcessHandler);
router.get("/versions/:id/execution-access", planReadAccess, validateIdParam, requirePlanVersionReadAccess(), getExecutionAccessHandler);
router.get(
    "/versions/:id/achievement-workflow-scope",
    planReadAccess,
    validateIdParam,
    requirePlanVersionReadAccess(),
    getAchievementWorkflowScope
);
router.get(
    "/versions/:id/sector-aggregation-publishes",
    planReadAccess,
    validateIdParam,
    requirePlanVersionReadAccess(),
    listSectorAggregationPublishStateHandler
);
router.post(
    "/versions/:id/sector-aggregation-publishes/publish",
    checkPermission("PLAN", "PUBLISH_SECTOR_AGGREGATION"),
    validateIdParam,
    publishSectorAggregationHandler
);
router.post(
    "/versions/:id/sector-aggregation-publishes/reject",
    checkPermission("PLAN", "PUBLISH_SECTOR_AGGREGATION"),
    validateIdParam,
    rejectSectorAggregationPublishHandler
);

router.get("/versions/:id/publish-for-review-readiness", checkPermission("PLAN", "PUBLISH_FOR_REVIEW"), validateIdParam, getPublishForReviewReadinessHandler);
router.post("/versions/:id/publish-for-review", checkPermission("PLAN", "PUBLISH_FOR_REVIEW"), validateIdParam, publishForReviewHandler);
router.post("/versions/:id/unlock-review-corrections", checkPermission("PLAN", "UNLOCK_REVIEW_CORRECTIONS"), validateIdParam, unlockForCorrectionsHandler);
router.post("/versions/:id/republish-for-review", checkPermission("PLAN", "REPUBLISH_REVIEW"), validateIdParam, republishForReviewHandler);
router.get("/versions/:id/complete-review-readiness", checkPermission("PLAN", "COMPLETE_REVIEW"), validateIdParam, getCompleteReviewReadinessHandler);
router.post("/versions/:id/complete-review", checkPermission("PLAN", "COMPLETE_REVIEW"), validateIdParam, completeReviewHandler);
router.get("/versions/:id/review-dashboard", checkAnyPermission([
    { resource: "PLANS", action: "READ" },
    { resource: "PLAN", action: "VIEW_ASSIGNED_REVIEW" },
    { resource: "PLAN", action: "VIEW_OWN_REVIEW_ISSUES" },
    { resource: "PLAN", action: "VIEW_REVIEW_DASHBOARD" },
    { resource: "PLAN", action: "COMPLETE_REVIEW" },
    { resource: "PLAN", action: "PUBLISH_FOR_REVIEW" },
]), validateIdParam, requirePlanVersionReadAccess(), getPlanReviewDashboardHandler);
router.patch("/nodes/:id/annual-target", checkPermission("PLANS", "UPDATE"), validateIdParam, validateUpdateAnnualTarget, updateAnnualTarget);
router.patch(
    "/nodes/:id/period-target",
    checkPermission("PLAN", "EXECUTE_ACHIEVEMENT"),
    validateIdParam,
    validateUpdatePeriodTarget,
    updatePeriodTarget
);
router.post(
    "/nodes/:id/achievement/submit",
    checkPermission("PLAN", "EXECUTE_ACHIEVEMENT"),
    validateIdParam,
    validateSubmitAchievement,
    submitAchievementHandler
);
router.post(
    "/nodes/:id/achievement/approve",
    checkPermission("PLAN", "APPROVE_ACHIEVEMENT"),
    validateIdParam,
    approveAchievementHandler
);
router.post(
    "/nodes/:id/achievement/validate",
    checkPermission("PLAN", "VALIDATE_APPROVAL"),
    validateIdParam,
    validateAchievementHandler
);
router.post(
    "/nodes/:id/achievement/validation-reject",
    checkPermission("PLAN", "VALIDATE_APPROVAL"),
    validateIdParam,
    validateRejectAchievement,
    rejectValidationAchievementHandler
);
router.post(
    "/nodes/:id/achievement/reject",
    checkPermission("PLAN", "APPROVE_ACHIEVEMENT"),
    validateIdParam,
    validateRejectAchievement,
    rejectAchievementHandler
);
router.post(
    "/nodes/:id/annual-achievement/submit",
    checkPermission("PLAN", "EXECUTE_ACHIEVEMENT"),
    validateIdParam,
    validateSubmitAnnualAchievement,
    submitAnnualAchievementHandler
);
router.post(
    "/nodes/:id/annual-achievement/approve",
    checkPermission("PLAN", "APPROVE_ACHIEVEMENT"),
    validateIdParam,
    approveAnnualAchievementHandler
);
router.post(
    "/nodes/:id/annual-achievement/validate",
    checkPermission("PLAN", "VALIDATE_APPROVAL"),
    validateIdParam,
    validateAnnualAchievementHandler
);
router.post(
    "/nodes/:id/annual-achievement/validation-reject",
    checkPermission("PLAN", "VALIDATE_APPROVAL"),
    validateIdParam,
    validateRejectAchievement,
    rejectValidationAnnualAchievementHandler
);
router.post(
    "/nodes/:id/annual-achievement/reject",
    checkPermission("PLAN", "APPROVE_ACHIEVEMENT"),
    validateIdParam,
    validateRejectAchievement,
    rejectAnnualAchievementHandler
);
router.patch(
    "/nodes/:id/period-actual",
    checkAnyPermission([
        { resource: "PLAN", action: "EXECUTE_ACHIEVEMENT" },
        { resource: "PLAN", action: "OVERRIDE_PARENT_ACHIEVEMENT" },
    ]),
    validateIdParam,
    validateUpdatePeriodActual,
    updatePeriodActual
);

// ================= PLANNING CONFIGURATION =================

router.get("/planning-config", planReadAccess, getPlanningConfiguration);
router.get(
    "/versions/:versionId/planning-config",
    planReadAccess,
    requirePlanVersionReadAccess("versionId"),
    getPlanningConfigurationForVersion
);
router.put(
    "/versions/:versionId/planning-config",
    checkPermission("PLAN", "DRAFT_PUBLISH"),
    requirePlanVersionReadAccess("versionId"),
    validateUpdatePlanningConfiguration,
    updatePlanningConfigurationForVersion
);
router.put(
    "/planning-config",
    checkPermission("PLANS", "UPDATE"),
    validateUpdatePlanningConfiguration,
    updatePlanningConfiguration
);
router.post(
    "/planning-config/restore-defaults",
    checkPermission("PLANS", "UPDATE"),
    restoreDefaultPlanningConfiguration
);

// ================= PLAN RULES =================

router.get("/rules", planRulesListAccess, getPlanRules);
router.get("/rules/:id", checkPermission("PLAN_RULES", "READ"), validateRuleIdParam, getPlanRuleById);
router.get("/versions/:versionId/rule", planReadAccess, requirePlanVersionReadAccess("versionId"), getPlanRuleForVersion);
router.put(
    "/versions/:versionId/rule",
    checkPermission("PLAN", "DRAFT_PUBLISH"),
    requirePlanVersionReadAccess("versionId"),
    validateUpdatePlanRule,
    updatePlanRuleForVersion
);
router.post("/rules", checkPermission("PLAN_RULES", "CREATE"), validateCreatePlanRule, createPlanRule);
router.put("/rules/:id", checkPermission("PLAN_RULES", "UPDATE"), validateRuleIdParam, validateUpdatePlanRule, updatePlanRule);
router.delete("/rules/:id", checkPermission("PLAN_RULES", "DELETE"), validateRuleIdParam, deletePlanRule);

// ================= PLAN NODES =================

router.post("/nodes", planStructureMutation, validateCreatePlanNode, createPlanNode);
router.get("/nodes", planReadAccess, validateGetPlanNodesQuery, requirePlanVersionReadAccessFromQuery(), getPlanNodes);
router.get("/nodes/:id", planReadAccess, validateIdParam, requirePlanNodeReadAccess(), getPlanNodeById);
router.put("/nodes/:id", planStructureMutation, validateIdParam, validateUpdatePlanNode, updatePlanNode);
router.delete("/nodes/:id", planStructureMutation, validateIdParam, deletePlanNode);
router.get("/hierarchy/:plan_version_id", planReadAccess, validateVersionIdParam, requirePlanVersionReadAccess("plan_version_id"), getPlanHierarchy);
router.post("/nodes/reorder", planStructureMutation, validateReorderPlanNodes, reorderPlanNodes);

module.exports = router;