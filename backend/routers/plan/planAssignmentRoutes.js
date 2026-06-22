const express = require("express");
const router = express.Router();

const {
    validateCreateExternalAssignment,
    validateUpdateExternalAssignment,
    validateCreateInternalAssignment,
    validateUpdateInternalAssignment,
    validateCreateActionLog,
    validateUpdateActionLogStatus,
    validateGetActionLogsQuery,
    validateIdParam,
    validateNodeIdParam,
    validateUserIdParam,
    validateGetAssignmentOptionsQuery,
    validateGetAssignmentsByNodeQuery,
} = require("../../validators/plan/planAssignmentValidator");

const {
    // External Assignments
    createExternalAssignment,
    getExternalAssignmentsByNode,
    updateExternalAssignment,
    deleteExternalAssignment,

    // Internal Assignments
    createInternalAssignment,
    getInternalAssignmentsByNode,
    getPlanNodeAssignmentOptions,
    getPlanNodeAssignmentScope,
    getAssignmentsByUser,
    updateInternalAssignment,
    deleteInternalAssignment,

    // Action Logs
    createActionLog,
    getActionLogsByNode,
    getActionLogById,
    updateActionLogStatus,
    getNodeActionSummary,
} = require("../../controllers/plan/planAssignmentController");

const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");
const {
    requirePlanNodeReadAccess,
} = require("../../middlewares/planReadAccessMiddleware");

const assignmentCreate = checkAnyPermission([
    { resource: "PLAN_ASSIGNMENTS", action: "CREATE" },
    { resource: "PLANS", action: "EDIT_FINALIZED" },
]);
const assignmentUpdate = checkAnyPermission([
    { resource: "PLAN_ASSIGNMENTS", action: "UPDATE" },
    { resource: "PLANS", action: "EDIT_FINALIZED" },
]);
const assignmentDelete = checkAnyPermission([
    { resource: "PLAN_ASSIGNMENTS", action: "DELETE" },
    { resource: "PLANS", action: "EDIT_FINALIZED" },
]);

const assignmentReadAccess = checkAnyPermission([
    { resource: "PLAN_ASSIGNMENTS", action: "READ" },
    { resource: "PLANS", action: "READ" },
    { resource: "PLAN", action: "VIEW_ASSIGNED_REVIEW" },
]);

// Apply authentication to all routes
router.use(authenticateToken);

// ================= EXTERNAL ASSIGNMENTS =================

router.post("/external", assignmentCreate, validateCreateExternalAssignment, createExternalAssignment);
router.get("/external/node/:plan_node_id", assignmentReadAccess, validateNodeIdParam, requirePlanNodeReadAccess("plan_node_id"), validateGetAssignmentsByNodeQuery, getExternalAssignmentsByNode);
router.put("/external/:id", assignmentUpdate, validateIdParam, validateUpdateExternalAssignment, updateExternalAssignment);
router.delete("/external/:id", assignmentDelete, validateIdParam, deleteExternalAssignment);

// ================= INTERNAL ASSIGNMENTS =================

router.post("/internal", assignmentCreate, validateCreateInternalAssignment, createInternalAssignment);
router.get("/scope/node/:plan_node_id", assignmentReadAccess, validateNodeIdParam, requirePlanNodeReadAccess("plan_node_id"), validateGetAssignmentOptionsQuery, getPlanNodeAssignmentScope);
router.get("/options/node/:plan_node_id", assignmentReadAccess, validateNodeIdParam, requirePlanNodeReadAccess("plan_node_id"), validateGetAssignmentOptionsQuery, getPlanNodeAssignmentOptions);
router.get("/internal/node/:plan_node_id", assignmentReadAccess, validateNodeIdParam, requirePlanNodeReadAccess("plan_node_id"), validateGetAssignmentsByNodeQuery, getInternalAssignmentsByNode);
router.get("/internal/user/:user_id", checkPermission("PLAN_ASSIGNMENTS", "READ"), validateUserIdParam, getAssignmentsByUser);
router.put("/internal/:id", assignmentUpdate, validateIdParam, validateUpdateInternalAssignment, updateInternalAssignment);
router.delete("/internal/:id", assignmentDelete, validateIdParam, deleteInternalAssignment);

// ================= ACTION LOGS =================

router.post("/logs", checkPermission("ACTION_LOGS", "CREATE"), validateCreateActionLog, createActionLog);
router.get("/logs/node/:plan_node_id", checkPermission("ACTION_LOGS", "READ"), validateNodeIdParam, validateGetActionLogsQuery, getActionLogsByNode);
router.get("/logs/:id", checkPermission("ACTION_LOGS", "READ"), validateIdParam, getActionLogById);
router.patch("/logs/:id/status", checkPermission("ACTION_LOGS", "UPDATE"), validateIdParam, validateUpdateActionLogStatus, updateActionLogStatus);
router.get("/logs/node/:plan_node_id/summary", checkPermission("ACTION_LOGS", "READ"), validateNodeIdParam, getNodeActionSummary);

module.exports = router;
