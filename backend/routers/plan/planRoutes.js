const express = require("express");
const router = express.Router();

const {
    validateCreatePlanVersion,
    validateUpdatePlanVersion,
    validateUpdatePlanVersionStatus,
    validateGetPlanVersionsQuery,
    validateCreatePlanNode,
    validateUpdatePlanNode,
    validateGetPlanNodesQuery,
    validateReorderPlanNodes,
    validateIdParam,
    validateVersionIdParam,
    validateUpdateAnnualTarget,
} = require("../../validators/plan/planValidator");

const {
    createPlanVersion,
    getPlanVersions,
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
    updateAnnualTarget,
    completeAnnualPlanVersion,
} = require("../../controllers/plan/planVersionLifecycleController");

const {
    getPlanRules,
    getPlanRuleById,
    getPlanRuleForVersion,
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
    updatePlanningConfiguration,
    restoreDefaultPlanningConfiguration,
} = require("../../controllers/plan/planningConfigurationController");

const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

// Apply authentication to all routes
router.use(authenticateToken);

// ================= PLAN VERSIONS =================

router.post("/versions", checkPermission("PLANS", "CREATE"), validateCreatePlanVersion, createPlanVersion);
router.get("/versions", checkPermission("PLANS", "READ"), validateGetPlanVersionsQuery, getPlanVersions);
router.get("/versions/:id", checkPermission("PLANS", "READ"), validateIdParam, getPlanVersionById);
router.put("/versions/:id", checkPermission("PLANS", "UPDATE"), validateIdParam, validateUpdatePlanVersion, updatePlanVersion);
router.delete("/versions/:id", checkPermission("PLANS", "DELETE"), validateIdParam, deletePlanVersion);
router.patch("/versions/:id/status", checkPermission("PLANS", "APPROVE"), validateIdParam, validateUpdatePlanVersionStatus, updatePlanVersionStatus);

router.get("/versions/:id/finalization-readiness", checkPermission("PLANS", "READ"), validateIdParam, getDraftFinalizationReadiness);
router.post("/versions/:id/finalize", checkPermission("PLANS", "APPROVE"), validateIdParam, finalizePlanDraft);
router.get("/versions/:id/annual-versions", checkPermission("PLANS", "READ"), validateIdParam, listAnnualVersions);
router.post("/versions/:id/complete-annual", checkPermission("PLANS", "APPROVE"), validateIdParam, completeAnnualPlanVersion);
router.patch("/nodes/:id/annual-target", checkPermission("PLANS", "UPDATE"), validateIdParam, validateUpdateAnnualTarget, updateAnnualTarget);

// ================= PLANNING CONFIGURATION =================

router.get("/planning-config", checkPermission("PLANS", "READ"), getPlanningConfiguration);
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

router.get("/rules", checkPermission("PLANS", "READ"), getPlanRules);
router.get("/rules/:id", checkPermission("PLANS", "READ"), validateRuleIdParam, getPlanRuleById);
router.get("/versions/:versionId/rule", checkPermission("PLANS", "READ"), getPlanRuleForVersion);
router.post("/rules", checkPermission("PLANS", "UPDATE"), validateCreatePlanRule, createPlanRule);
router.put("/rules/:id", checkPermission("PLANS", "UPDATE"), validateRuleIdParam, validateUpdatePlanRule, updatePlanRule);
router.delete("/rules/:id", checkPermission("PLANS", "DELETE"), validateRuleIdParam, deletePlanRule);

// ================= PLAN NODES =================

router.post("/nodes", checkPermission("PLANS", "UPDATE"), validateCreatePlanNode, createPlanNode);
router.get("/nodes", checkPermission("PLANS", "READ"), validateGetPlanNodesQuery, getPlanNodes);
router.get("/nodes/:id", checkPermission("PLANS", "READ"), validateIdParam, getPlanNodeById);
router.put("/nodes/:id", checkPermission("PLANS", "UPDATE"), validateIdParam, validateUpdatePlanNode, updatePlanNode);
router.delete("/nodes/:id", checkPermission("PLANS", "UPDATE"), validateIdParam, deletePlanNode);
router.get("/hierarchy/:plan_version_id", checkPermission("PLANS", "READ"), validateVersionIdParam, getPlanHierarchy);
router.post("/nodes/reorder", checkPermission("PLANS", "UPDATE"), validateReorderPlanNodes, reorderPlanNodes);

module.exports = router;