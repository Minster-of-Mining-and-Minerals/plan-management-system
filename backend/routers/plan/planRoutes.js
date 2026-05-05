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

// ================= PLAN NODES =================

router.post("/nodes", checkPermission("PLANS", "UPDATE"), validateCreatePlanNode, createPlanNode);
router.get("/nodes", checkPermission("PLANS", "READ"), validateGetPlanNodesQuery, getPlanNodes);
router.get("/nodes/:id", checkPermission("PLANS", "READ"), validateIdParam, getPlanNodeById);
router.put("/nodes/:id", checkPermission("PLANS", "UPDATE"), validateIdParam, validateUpdatePlanNode, updatePlanNode);
router.delete("/nodes/:id", checkPermission("PLANS", "UPDATE"), validateIdParam, deletePlanNode);
router.get("/hierarchy/:plan_version_id", checkPermission("PLANS", "READ"), validateVersionIdParam, getPlanHierarchy);
router.post("/nodes/reorder", checkPermission("PLANS", "UPDATE"), validateReorderPlanNodes, reorderPlanNodes);

module.exports = router;