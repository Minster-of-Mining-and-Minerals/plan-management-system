const express = require("express");
const router = express.Router();

const {
    validateCreateAssignmentAction,
    validateUpdateAssignmentAction,
    validateGetAssignmentActionsQuery,
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
    // Assignment Actions
    createAssignmentAction,
    getAssignmentActions,

    // External Assignments
    createExternalAssignment,
    getExternalAssignmentsByNode,
    updateExternalAssignment,
    deleteExternalAssignment,

    // Internal Assignments
    createInternalAssignment,
    getInternalAssignmentsByNode,
    getPlanNodeAssignmentOptions,
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

// Apply authentication to all routes
router.use(authenticateToken);

// ================= ASSIGNMENT ACTIONS (Master Data) =================

router.post("/actions", checkPermission("PLAN_ASSIGNMENT_ACTIONS", "CREATE"), validateCreateAssignmentAction, createAssignmentAction);
router.get("/actions", checkPermission("PLAN_ASSIGNMENT_ACTIONS", "READ"), validateGetAssignmentActionsQuery, getAssignmentActions);

// ================= EXTERNAL ASSIGNMENTS =================

router.post("/external", assignmentCreate, validateCreateExternalAssignment, createExternalAssignment);
router.get("/external/node/:plan_node_id", checkPermission("PLAN_ASSIGNMENTS", "READ"), validateNodeIdParam, validateGetAssignmentsByNodeQuery, getExternalAssignmentsByNode);
router.put("/external/:id", assignmentUpdate, validateIdParam, validateUpdateExternalAssignment, updateExternalAssignment);
router.delete("/external/:id", assignmentDelete, validateIdParam, deleteExternalAssignment);

// ================= INTERNAL ASSIGNMENTS =================

router.post("/internal", assignmentCreate, validateCreateInternalAssignment, createInternalAssignment);
router.get("/options/node/:plan_node_id", checkPermission("PLAN_ASSIGNMENTS", "READ"), validateNodeIdParam, validateGetAssignmentOptionsQuery, getPlanNodeAssignmentOptions);
router.get("/internal/node/:plan_node_id", checkPermission("PLAN_ASSIGNMENTS", "READ"), validateNodeIdParam, validateGetAssignmentsByNodeQuery, getInternalAssignmentsByNode);
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
