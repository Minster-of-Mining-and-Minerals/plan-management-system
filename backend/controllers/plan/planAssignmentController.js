"use strict";

const {
    PlanNode,
    PlanVersion,
    ExternalAssignment,
    InternalAssignment,
    PlanAssignmentAction,
    PlanNodeActionLog,
    GovernmentStructure,
    InternalStructure,
    User,
    sequelize,
} = require("../../models");

const { v4: uuidv4, validate: isUuid } = require("uuid");
const { Op } = require("sequelize");
const {
    getAssignmentOptionsForNode,
    validateExternalAssignmentTarget,
    validateInternalAssignmentTarget,
    resolveBranchFieldsForCreate,
    resolveInternalTargetForBranch,
    deactivateActiveAssignmentsForNode,
} = require("../../services/planAssignmentHierarchyService");

const {
    propagateExternalAssignmentCreate,
    propagateInternalAssignmentCreate,
    shouldPropagateMasterStructureChanges,
} = require("../../services/planMasterEditService");
const {
    validateCanEditMasterPlanStructure,
} = require("../../utils/planMasterEditUtils");

/**
 * =================== PLAN ASSIGNMENT ACTIONS (Master Data) ===================
 */

// Create assignment action
const createAssignmentAction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, code, description, is_approval, is_execution, is_reporting } = req.body;

        const action = await PlanAssignmentAction.create(
            {
                assignment_action_id: uuidv4(),
                name,
                code,
                description,
                is_approval: is_approval || false,
                is_execution: is_execution || false,
                is_reporting: is_reporting || false,
            },
            { transaction: t }
        );

        await t.commit();

        return res.status(201).json({
            success: true,
            message: "Assignment action created",
            data: action,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Get all assignment actions
const getAssignmentActions = async (req, res) => {
    try {
        const { type } = req.query;
        const where = {};

        if (type === "approval") where.is_approval = true;
        if (type === "execution") where.is_execution = true;
        if (type === "reporting") where.is_reporting = true;

        const actions = await PlanAssignmentAction.findAll({
            where,
            order: [["name", "ASC"]],
        });

        return res.json({
            success: true,
            data: actions,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== EXTERNAL ASSIGNMENTS ===================
 */

// Create external assignment
const createExternalAssignment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { plan_node_id, government_structure_id, is_visible, requires_report } = req.body;

        // Verify plan node exists and its version is draft
        const planNode = await PlanNode.findByPk(plan_node_id, {
            include: [{ model: PlanVersion, as: "planVersion" }],
            transaction: t,
        });

        if (!planNode) {
            await t.rollback();
            return res.status(404).json({ message: "Plan node not found" });
        }

        const structureAccess = validateCanEditMasterPlanStructure(planNode.planVersion, req.user);
        if (!structureAccess.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: structureAccess.message,
            });
        }

        // Verify government structure exists
        const govStructure = await GovernmentStructure.findByPk(government_structure_id, { transaction: t });
        if (!govStructure) {
            await t.rollback();
            return res.status(404).json({ message: "Government structure not found" });
        }

        const hierarchyError = await validateExternalAssignmentTarget(
            planNode,
            government_structure_id,
            t
        );
        if (hierarchyError) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: hierarchyError,
            });
        }

        if (planNode.assignment_sharing_mode === "exclusive") {
            await deactivateActiveAssignmentsForNode(planNode.plan_node_id, "external", t);
        }

        const assignment = await ExternalAssignment.create(
            {
                external_assignment_id: uuidv4(),
                plan_node_id,
                government_structure_id,
                is_visible: is_visible !== undefined ? is_visible : true,
                requires_report: requires_report !== undefined ? requires_report : true,
                is_active: true,
            },
            { transaction: t }
        );

        if (await shouldPropagateMasterStructureChanges(planNode.planVersion, t)) {
            await propagateExternalAssignmentCreate(plan_node_id, assignment, t);
        }

        await t.commit();

        return res.status(201).json({
            success: true,
            message: "External assignment created",
            data: assignment,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Get external assignments by plan node
const getExternalAssignmentsByNode = async (req, res) => {
    try {
        const { plan_node_id } = req.params;
        const includeInactive = req.query.include_inactive === "true";

        if (!isUuid(plan_node_id)) {
            return res.status(400).json({ message: "Invalid node ID format" });
        }

        const where = { plan_node_id };
        if (!includeInactive) {
            where.is_active = true;
        }

        const assignments = await ExternalAssignment.findAll({
            where,
            include: [
                {
                    model: PlanNode,
                    as: "planNode",
                },
                {
                    model: GovernmentStructure,
                    as: "governmentStructure",
                },
            ],
        });

        return res.json({
            success: true,
            data: assignments,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Update external assignment
const updateExternalAssignment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const assignment = await ExternalAssignment.findByPk(id, {
            include: [
                {
                    model: PlanNode,
                    as: "planNode",
                    include: [{ model: PlanVersion, as: "planVersion" }],
                },
            ],
            transaction: t,
        });

        if (!assignment) {
            await t.rollback();
            return res.status(404).json({ message: "Assignment not found" });
        }

        const structureAccess = validateCanEditMasterPlanStructure(assignment.planNode.planVersion, req.user);
        if (!structureAccess.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: structureAccess.message,
            });
        }

        await assignment.update(req.body, { transaction: t });

        await t.commit();

        return res.json({
            success: true,
            message: "External assignment updated",
            data: assignment,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Delete external assignment
const deleteExternalAssignment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const assignment = await ExternalAssignment.findByPk(id, {
            include: [
                {
                    model: PlanNode,
                    as: "planNode",
                    include: [{ model: PlanVersion, as: "planVersion" }],
                },
            ],
            transaction: t,
        });

        if (!assignment) {
            await t.rollback();
            return res.status(404).json({ message: "Assignment not found" });
        }

        const structureAccess = validateCanEditMasterPlanStructure(assignment.planNode.planVersion, req.user);
        if (!structureAccess.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: structureAccess.message,
            });
        }

        await assignment.update({ is_active: false }, { transaction: t });

        await t.commit();

        return res.json({ message: "External assignment deactivated successfully" });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== INTERNAL ASSIGNMENTS ===================
 */

// Create internal assignment
const createInternalAssignment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            plan_node_id,
            internal_structure_id,
            user_id,
            action_id,
            branch_external_assignment_id,
            branch_internal_assignment_id,
            propagate_all_branches,
        } = req.body;

        // Verify plan node exists and its version is draft
        const planNode = await PlanNode.findByPk(plan_node_id, {
            include: [{ model: PlanVersion, as: "planVersion" }],
            transaction: t,
        });

        if (!planNode) {
            await t.rollback();
            return res.status(404).json({ message: "Plan node not found" });
        }

        const structureAccess = validateCanEditMasterPlanStructure(planNode.planVersion, req.user);
        if (!structureAccess.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: structureAccess.message,
            });
        }

        if (!internal_structure_id && !user_id) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Must assign to either internal structure or user",
            });
        }

        if (internal_structure_id && user_id) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot assign to both internal structure and user",
            });
        }

        const action = await PlanAssignmentAction.findByPk(action_id, { transaction: t });
        if (!action) {
            await t.rollback();
            return res.status(404).json({ message: "Assignment action not found" });
        }

        if (internal_structure_id) {
            const internalStructure = await InternalStructure.findByPk(internal_structure_id, { transaction: t });
            if (!internalStructure) {
                await t.rollback();
                return res.status(404).json({ message: "Internal structure not found" });
            }
        }

        if (user_id) {
            const user = await User.findByPk(user_id, { transaction: t });
            if (!user) {
                await t.rollback();
                return res.status(404).json({ message: "User not found" });
            }
        }

        let parentNode = null;
        if (planNode.parent_id) {
            parentNode = await PlanNode.findByPk(planNode.parent_id, { transaction: t });
        }

        const branchResult = await resolveBranchFieldsForCreate(
            planNode,
            parentNode,
            {
                branch_external_assignment_id,
                branch_internal_assignment_id,
                propagate_all_branches: propagate_all_branches !== false,
            },
            t
        );
        if (branchResult.error) {
            await t.rollback();
            return res.status(400).json({ success: false, message: branchResult.error });
        }

        const branchTargets = branchResult.branches ? branchResult.branches : [branchResult];

        if (planNode.assignment_sharing_mode === "exclusive") {
            await deactivateActiveAssignmentsForNode(planNode.plan_node_id, "internal", t);
        }

        const created = [];
        const skipped = [];

        for (const branchFields of branchTargets) {
            let target = {
                internal_structure_id: internal_structure_id || null,
                user_id: user_id || null,
            };

            if (branchTargets.length > 1) {
                const resolved = await resolveInternalTargetForBranch(
                    planNode,
                    parentNode,
                    target,
                    branchFields,
                    t
                );
                if (!resolved) {
                    skipped.push(branchFields.label || "branch");
                    continue;
                }
                target = resolved;
            }

            const branchContext = {
                branchExternalAssignmentId: branchFields.branch_external_assignment_id,
                branchInternalAssignmentId: branchFields.branch_internal_assignment_id,
            };

            const hierarchyError = await validateInternalAssignmentTarget(
                planNode,
                target,
                t,
                branchContext,
                branchFields
            );
            if (hierarchyError) {
                skipped.push(branchFields.label || hierarchyError);
                continue;
            }

            const assignment = await InternalAssignment.create(
                {
                    internal_assignment_id: uuidv4(),
                    plan_node_id,
                    internal_structure_id: target.internal_structure_id,
                    user_id: target.user_id,
                    action_id,
                    is_active: true,
                    branch_external_assignment_id: branchFields.branch_external_assignment_id,
                    branch_internal_assignment_id: branchFields.branch_internal_assignment_id,
                },
                { transaction: t }
            );

            created.push(assignment);
        }

        if (created.length === 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message:
                    skipped.length > 0
                        ? `No assignments created. Skipped branches: ${skipped.join(", ")}`
                        : "No valid branch assignments could be created.",
            });
        }

        if (await shouldPropagateMasterStructureChanges(planNode.planVersion, t)) {
            for (const assignment of created) {
                await propagateInternalAssignmentCreate(plan_node_id, assignment, t);
            }
        }

        await t.commit();

        const message =
            created.length > 1
                ? `Internal assignments created across ${created.length} branches`
                : "Internal assignment created";

        return res.status(201).json({
            success: true,
            message,
            data: created.length === 1 ? created[0] : created,
            branches_created: created.length,
            branches_skipped: skipped.length,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Get internal assignments by plan node
const getInternalAssignmentsByNode = async (req, res) => {
    try {
        const { plan_node_id } = req.params;
        const includeInactive = req.query.include_inactive === "true";

        if (!isUuid(plan_node_id)) {
            return res.status(400).json({ message: "Invalid node ID format" });
        }

        const where = { plan_node_id };
        if (!includeInactive) {
            where.is_active = true;
        }

        const assignments = await InternalAssignment.findAll({
            where,
            include: [
                {
                    model: PlanNode,
                    as: "planNode",
                },
                {
                    model: PlanAssignmentAction,
                    as: "action",
                },
                {
                    model: InternalStructure,
                    as: "internalStructure",
                },
                {
                    model: User,
                    as: "user",
                    attributes: { exclude: ["password"] },
                },
                {
                    model: ExternalAssignment,
                    as: "branchExternalAssignment",
                    include: [{ model: GovernmentStructure, as: "governmentStructure" }],
                },
                {
                    model: InternalAssignment,
                    as: "branchInternalAssignment",
                    include: [
                        { model: InternalStructure, as: "internalStructure" },
                        { model: User, as: "user", attributes: { exclude: ["password"] } },
                    ],
                },
            ],
        });

        const data = assignments.map((assignment) => {
            const plain = assignment.toJSON();
            plain.branch_label =
                plain.branchExternalAssignment?.governmentStructure?.name ||
                plain.branchInternalAssignment?.user?.full_name ||
                plain.branchInternalAssignment?.internalStructure?.name ||
                null;
            return plain;
        });

        return res.json({
            success: true,
            data,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get assignments by user
const getAssignmentsByUser = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!isUuid(user_id)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        const assignments = await InternalAssignment.findAll({
            where: { user_id, is_active: true },
            include: [
                {
                    model: PlanNode,
                    as: "planNode",
                    include: [
                        {
                            model: PlanVersion,
                            as: "planVersion",
                            where: { status: "active" },
                        },
                    ],
                },
                {
                    model: PlanAssignmentAction,
                    as: "action",
                },
            ],
        });

        return res.json({
            success: true,
            data: assignments,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Update internal assignment
const updateInternalAssignment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const assignment = await InternalAssignment.findByPk(id, {
            include: [
                {
                    model: PlanNode,
                    as: "planNode",
                    include: [{ model: PlanVersion, as: "planVersion" }],
                },
            ],
            transaction: t,
        });

        if (!assignment) {
            await t.rollback();
            return res.status(404).json({ message: "Assignment not found" });
        }

        const structureAccess = validateCanEditMasterPlanStructure(assignment.planNode.planVersion, req.user);
        if (!structureAccess.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: structureAccess.message,
            });
        }

        await assignment.update(req.body, { transaction: t });

        await t.commit();

        return res.json({
            success: true,
            message: "Internal assignment updated",
            data: assignment,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Delete internal assignment
const deleteInternalAssignment = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const assignment = await InternalAssignment.findByPk(id, {
            include: [
                {
                    model: PlanNode,
                    as: "planNode",
                    include: [{ model: PlanVersion, as: "planVersion" }],
                },
            ],
            transaction: t,
        });

        if (!assignment) {
            await t.rollback();
            return res.status(404).json({ message: "Assignment not found" });
        }

        const structureAccess = validateCanEditMasterPlanStructure(assignment.planNode.planVersion, req.user);
        if (!structureAccess.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: structureAccess.message,
            });
        }

        await assignment.update({ is_active: false }, { transaction: t });

        await t.commit();

        return res.json({ message: "Internal assignment deactivated successfully" });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== PLAN NODE ACTION LOGS ===================
 */

// Create action log
const createActionLog = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { plan_node_id, action_id, user_id, comment, status } = req.body;

        // Verify plan node exists
        const planNode = await PlanNode.findByPk(plan_node_id, {
            include: [{ model: PlanVersion, as: "planVersion" }],
            transaction: t,
        });

        if (!planNode) {
            await t.rollback();
            return res.status(404).json({ message: "Plan node not found" });
        }

        // Verify action exists
        const action = await PlanAssignmentAction.findByPk(action_id, { transaction: t });
        if (!action) {
            await t.rollback();
            return res.status(404).json({ message: "Action not found" });
        }

        // Verify user exists
        const user = await User.findByPk(user_id, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "User not found" });
        }

        // Verify user has assignment for this node and action
        const hasAssignment = await InternalAssignment.findOne({
            where: {
                plan_node_id,
                user_id,
                action_id,
                is_active: true,
            },
            transaction: t,
        });

        if (!hasAssignment) {
            await t.rollback();
            return res.status(403).json({
                success: false,
                message: "User not authorized to perform this action on this node",
            });
        }

        const actionLog = await PlanNodeActionLog.create(
            {
                action_log_id: uuidv4(),
                plan_node_id,
                action_id,
                user_id,
                comment,
                status: status || "submitted",
            },
            { transaction: t }
        );

        await t.commit();

        return res.status(201).json({
            success: true,
            message: "Action log created",
            data: actionLog,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Get action logs by plan node
const getActionLogsByNode = async (req, res) => {
    try {
        const { plan_node_id } = req.params;
        const { status, action_id } = req.query;

        if (!isUuid(plan_node_id)) {
            return res.status(400).json({ message: "Invalid node ID format" });
        }

        const where = { plan_node_id };
        if (status) where.status = status;
        if (action_id) where.action_id = action_id;

        const logs = await PlanNodeActionLog.findAll({
            where,
            include: [
                {
                    model: PlanNode,
                    as: "planNode",
                },
                {
                    model: PlanAssignmentAction,
                    as: "action",
                },
                {
                    model: User,
                    as: "user",
                    attributes: ["user_id", "name", "email"],
                },
            ],
            order: [["created_at", "DESC"]],
        });

        return res.json({
            success: true,
            data: logs,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get action log by ID
const getActionLogById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const log = await PlanNodeActionLog.findByPk(id, {
            include: [
                {
                    model: PlanNode,
                    as: "planNode",
                },
                {
                    model: PlanAssignmentAction,
                    as: "action",
                },
                {
                    model: User,
                    as: "user",
                    attributes: ["user_id", "name", "email"],
                },
            ],
        });

        if (!log) {
            return res.status(404).json({ message: "Action log not found" });
        }

        return res.json({
            success: true,
            data: log,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Update action log status (e.g., approve/reject)
const updateActionLogStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { status, comment } = req.body;
        const { user_id } = req.user || req.body; // Assuming user from auth middleware

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const actionLog = await PlanNodeActionLog.findByPk(id, {
            include: [{ model: PlanNode, as: "planNode" }],
            transaction: t,
        });

        if (!actionLog) {
            await t.rollback();
            return res.status(404).json({ message: "Action log not found" });
        }

        // Verify user has approval permission
        const hasApprovalRole = await InternalAssignment.findOne({
            where: {
                plan_node_id: actionLog.plan_node_id,
                user_id,
                action_id: actionLog.action_id,
            },
            transaction: t,
        });

        if (!hasApprovalRole) {
            await t.rollback();
            return res.status(403).json({
                success: false,
                message: "User not authorized to update this action log",
            });
        }

        // Update status
        await actionLog.update({ status, comment }, { transaction: t });

        // If approved, maybe update something else (e.g., node status)
        if (status === "approved") {
            // Additional logic for approved action
            // For example: mark node as completed, trigger next steps, etc.
        }

        await t.commit();

        return res.json({
            success: true,
            message: `Action log status updated to ${status}`,
            data: actionLog,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Get action summary for a plan node
const getNodeActionSummary = async (req, res) => {
    try {
        const { plan_node_id } = req.params;

        if (!isUuid(plan_node_id)) {
            return res.status(400).json({ message: "Invalid node ID format" });
        }

        const summary = await PlanNodeActionLog.findAll({
            where: { plan_node_id },
            attributes: [
                "action_id",
                "status",
                [sequelize.fn("COUNT", sequelize.col("action_log_id")), "count"],
            ],
            group: ["action_id", "status"],
            include: [
                {
                    model: PlanAssignmentAction,
                    as: "action",
                    attributes: ["name", "code"],
                },
            ],
        });

        return res.json({
            success: true,
            data: summary,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get hierarchical assignment options for a plan node
const getPlanNodeAssignmentOptions = async (req, res) => {
    try {
        const { plan_node_id } = req.params;
        const { branch_external_assignment_id, branch_internal_assignment_id } = req.query;

        if (!isUuid(plan_node_id)) {
            return res.status(400).json({ message: "Invalid node ID format" });
        }

        const options = await getAssignmentOptionsForNode(plan_node_id, null, {
            branchExternalAssignmentId: branch_external_assignment_id || null,
            branchInternalAssignmentId: branch_internal_assignment_id || null,
        });

        return res.json({
            success: true,
            data: options,
        });
    } catch (error) {
        const status = error.status || 500;
        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
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
    getAssignmentsByUser,
    getPlanNodeAssignmentOptions,
    updateInternalAssignment,
    deleteInternalAssignment,

    // Action Logs
    createActionLog,
    getActionLogsByNode,
    getActionLogById,
    updateActionLogStatus,
    getNodeActionSummary,
};