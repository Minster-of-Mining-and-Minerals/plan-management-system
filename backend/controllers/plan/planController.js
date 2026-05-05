"use strict";

const {
    PlanVersion,
    PlanNode,
    GovernmentStructure,
    sequelize,
} = require("../../models");

const { v4: uuidv4, validate: isUuid } = require("uuid");
const { Op } = require("sequelize");

/**
 * =================== PLAN VERSION CRUD ===================
 */

// Create new plan version
const createPlanVersion = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { year, government_structure_id, based_on_version_id } = req.body;

        // Check if government structure exists
        const govStructure = await GovernmentStructure.findByPk(government_structure_id, { transaction: t });
        if (!govStructure) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: "Government structure not found",
            });
        }

        // Get latest version number for this year and government structure
        const latestVersion = await PlanVersion.findOne({
            where: { year, government_structure_id },
            order: [["version_number", "DESC"]],
            transaction: t,
        });

        const version_number = latestVersion ? latestVersion.version_number + 1 : 1;

        // If based_on_version_id provided, verify it exists
        if (based_on_version_id) {
            const baseVersion = await PlanVersion.findByPk(based_on_version_id, { transaction: t });
            if (!baseVersion) {
                await t.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Base plan version not found",
                });
            }
        }

        const planVersion = await PlanVersion.create(
            {
                plan_version_id: uuidv4(),
                year,
                version_number,
                status: "draft",
                government_structure_id,
                based_on_version_id: based_on_version_id || null,
            },
            { transaction: t }
        );

        // If based on existing version, copy its nodes
        if (based_on_version_id) {
            await copyNodesFromVersion(based_on_version_id, planVersion.plan_version_id, t);
        }

        await t.commit();

        return res.status(201).json({
            success: true,
            message: "Plan version created successfully",
            data: planVersion,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Helper function to copy nodes from another version
async function copyNodesFromVersion(sourceVersionId, targetVersionId, transaction) {
    const sourceNodes = await PlanNode.findAll({
        where: { plan_version_id: sourceVersionId },
        transaction,
    });

    const nodeIdMap = new Map();

    // First pass: create all nodes without parent relationships
    for (const sourceNode of sourceNodes) {
        const newNodeId = uuidv4();
        nodeIdMap.set(sourceNode.plan_node_id, newNodeId);

        await PlanNode.create(
            {
                plan_node_id: newNodeId,
                plan_version_id: targetVersionId,
                parent_id: null, // Will update in second pass
                type: sourceNode.type,
                title: sourceNode.title,
                description: sourceNode.description,
                weight: sourceNode.weight,
                level: sourceNode.level,
                order: sourceNode.order,
                is_active: sourceNode.is_active,
            },
            { transaction }
        );
    }

    // Second pass: update parent relationships
    for (const sourceNode of sourceNodes) {
        if (sourceNode.parent_id) {
            const newParentId = nodeIdMap.get(sourceNode.parent_id);
            const newNodeId = nodeIdMap.get(sourceNode.plan_node_id);

            await PlanNode.update(
                { parent_id: newParentId },
                { where: { plan_node_id: newNodeId }, transaction }
            );
        }
    }
}

// Get all plan versions with filters
const getPlanVersions = async (req, res) => {
    try {
        const { year, government_structure_id, status, search } = req.query;

        const where = {};

        if (year) where.year = parseInt(year);
        if (government_structure_id) where.government_structure_id = government_structure_id;
        if (status) where.status = status;
        if (search && search.trim()) {
            where[Op.or] = [
                { year: { [Op.eq]: parseInt(search) || null } },
            ];
        }

        const versions = await PlanVersion.findAll({
            where,
            include: [
                {
                    model: GovernmentStructure,
                    as: "governmentStructure",
                },
                {
                    model: PlanVersion,
                    as: "baseVersion",
                },
                {
                    model: PlanNode,
                    as: "planNodes",
                    required: false,
                    attributes: ["plan_node_id", "title", "type", "level"],
                },
            ],
            order: [["year", "DESC"], ["version_number", "DESC"]],
        });

        return res.json({
            success: true,
            data: versions,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get plan version by ID
const getPlanVersionById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const planVersion = await PlanVersion.findByPk(id, {
            include: [
                {
                    model: GovernmentStructure,
                    as: "governmentStructure",
                },
                {
                    model: PlanVersion,
                    as: "baseVersion",
                },
                {
                    model: PlanNode,
                    as: "planNodes",
                    include: [
                        {
                            model: PlanNode,
                            as: "children",
                        },
                        {
                            model: PlanNode,
                            as: "parent",
                        },
                    ],
                },
            ],
        });

        if (!planVersion) {
            return res.status(404).json({ message: "Plan version not found" });
        }

        return res.json({
            success: true,
            data: planVersion,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Update plan version
const updatePlanVersion = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const planVersion = await PlanVersion.findByPk(id, { transaction: t });

        if (!planVersion) {
            await t.rollback();
            return res.status(404).json({ message: "Plan version not found" });
        }

        // Prevent updating active/completed versions
        if (planVersion.status !== "draft") {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot update non-draft plan version",
            });
        }

        await planVersion.update(req.body, { transaction: t });

        await t.commit();

        return res.json({
            success: true,
            message: "Plan version updated",
            data: planVersion,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Delete (soft) plan version
const deletePlanVersion = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const planVersion = await PlanVersion.findByPk(id, { transaction: t });

        if (!planVersion) {
            await t.rollback();
            return res.status(404).json({ message: "Plan version not found" });
        }

        // Check if this version is being used as base for another version
        const dependentVersions = await PlanVersion.count({
            where: { based_on_version_id: id },
            transaction: t,
        });

        if (dependentVersions > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot delete version that is used as base for other versions",
            });
        }

        await planVersion.destroy({ transaction: t });

        await t.commit();

        return res.json({ message: "Plan version deleted successfully" });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Change plan version status
const updatePlanVersionStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const planVersion = await PlanVersion.findByPk(id, { transaction: t });

        if (!planVersion) {
            await t.rollback();
            return res.status(404).json({ message: "Plan version not found" });
        }

        // Validate status transition
        const validTransitions = {
            draft: ["active"],
            active: ["completed"],
            completed: [],
        };

        if (!validTransitions[planVersion.status].includes(status)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `Invalid status transition from ${planVersion.status} to ${status}`,
            });
        }

        await planVersion.update({ status }, { transaction: t });

        await t.commit();

        return res.json({
            success: true,
            message: `Plan version status updated to ${status}`,
            data: planVersion,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== PLAN NODE CRUD ===================
 */

// Create plan node
const createPlanNode = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            plan_version_id,
            parent_id,
            type,
            title,
            description,
            weight,
            level,
            order,
        } = req.body;

        // Verify plan version exists and is draft
        const planVersion = await PlanVersion.findByPk(plan_version_id, { transaction: t });
        if (!planVersion) {
            await t.rollback();
            return res.status(404).json({ message: "Plan version not found" });
        }

        if (planVersion.status !== "draft") {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Can only add nodes to draft plan versions",
            });
        }

        // If parent_id provided, verify it exists and belongs to same version
        if (parent_id) {
            const parentNode = await PlanNode.findOne({
                where: {
                    plan_node_id: parent_id,
                    plan_version_id,
                },
                transaction: t,
            });

            if (!parentNode) {
                await t.rollback();
                return res.status(404).json({ message: "Parent node not found in this version" });
            }
        }

        // Calculate level if not provided
        let nodeLevel = level;
        if (!nodeLevel && parent_id) {
            const parentNode = await PlanNode.findByPk(parent_id, { transaction: t });
            nodeLevel = parentNode.level + 1;
        } else if (!nodeLevel) {
            nodeLevel = 1;
        }

        const planNode = await PlanNode.create(
            {
                plan_node_id: uuidv4(),
                plan_version_id,
                parent_id: parent_id || null,
                type,
                title,
                description,
                weight: weight || 0,
                level: nodeLevel,
                order: order || 0,
                is_active: true,
            },
            { transaction: t }
        );

        await t.commit();

        return res.status(201).json({
            success: true,
            message: "Plan node created",
            data: planNode,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Get all plan nodes for a version
const getPlanNodes = async (req, res) => {
    try {
        const { plan_version_id, type, parent_id, level, is_active } = req.query;

        const where = {};
        if (plan_version_id) where.plan_version_id = plan_version_id;
        if (type) where.type = type;
        if (parent_id !== undefined) where.parent_id = parent_id || null;
        if (level) where.level = parseInt(level);
        if (is_active !== undefined) where.is_active = is_active === "true";

        const nodes = await PlanNode.findAll({
            where,
            include: [
                {
                    model: PlanVersion,
                    as: "planVersion",
                },
                {
                    model: PlanNode,
                    as: "parent",
                },
                {
                    model: PlanNode,
                    as: "children",
                },
            ],
            order: [["order", "ASC"], ["created_at", "ASC"]],
        });

        return res.json({
            success: true,
            data: nodes,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get plan node by ID
const getPlanNodeById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const planNode = await PlanNode.findByPk(id, {
            include: [
                {
                    model: PlanVersion,
                    as: "planVersion",
                },
                {
                    model: PlanNode,
                    as: "parent",
                },
                {
                    model: PlanNode,
                    as: "children",
                },
            ],
        });

        if (!planNode) {
            return res.status(404).json({ message: "Plan node not found" });
        }

        return res.json({
            success: true,
            data: planNode,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Update plan node
const updatePlanNode = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const planNode = await PlanNode.findByPk(id, {
            include: [{ model: PlanVersion, as: "planVersion" }],
            transaction: t,
        });

        if (!planNode) {
            await t.rollback();
            return res.status(404).json({ message: "Plan node not found" });
        }

        // Check if plan version is draft
        if (planNode.planVersion.status !== "draft") {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Can only update nodes in draft plan versions",
            });
        }

        await planNode.update(req.body, { transaction: t });

        await t.commit();

        return res.json({
            success: true,
            message: "Plan node updated",
            data: planNode,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Delete plan node
const deletePlanNode = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const planNode = await PlanNode.findByPk(id, {
            include: [{ model: PlanVersion, as: "planVersion" }],
            transaction: t,
        });

        if (!planNode) {
            await t.rollback();
            return res.status(404).json({ message: "Plan node not found" });
        }

        if (planNode.planVersion.status !== "draft") {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Can only delete nodes from draft plan versions",
            });
        }

        // Check if node has children
        const childrenCount = await PlanNode.count({
            where: { parent_id: id },
            transaction: t,
        });

        if (childrenCount > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot delete node with children. Delete children first or reassign.",
            });
        }

        await planNode.destroy({ transaction: t });

        await t.commit();

        return res.json({ message: "Plan node deleted successfully" });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Get plan hierarchy tree
const getPlanHierarchy = async (req, res) => {
    try {
        const { plan_version_id } = req.params;

        if (!isUuid(plan_version_id)) {
            return res.status(400).json({ message: "Invalid version ID format" });
        }

        const nodes = await PlanNode.findAll({
            where: { plan_version_id, is_active: true },
            order: [["order", "ASC"]],
        });

        // Build tree structure
        const nodeMap = new Map();
        const roots = [];

        nodes.forEach(node => {
            nodeMap.set(node.plan_node_id, { ...node.toJSON(), children: [] });
        });

        nodes.forEach(node => {
            const nodeWithChildren = nodeMap.get(node.plan_node_id);
            if (node.parent_id && nodeMap.has(node.parent_id)) {
                nodeMap.get(node.parent_id).children.push(nodeWithChildren);
            } else {
                roots.push(nodeWithChildren);
            }
        });

        return res.json({
            success: true,
            data: roots,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Reorder nodes
const reorderPlanNodes = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { parent_id, nodeOrders } = req.body;
        // nodeOrders: [{ plan_node_id, order }]

        for (const item of nodeOrders) {
            await PlanNode.update(
                { order: item.order },
                {
                    where: { plan_node_id: item.plan_node_id, parent_id: parent_id || null },
                    transaction: t,
                }
            );
        }

        await t.commit();

        return res.json({
            success: true,
            message: "Nodes reordered successfully",
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    // Plan Version
    createPlanVersion,
    getPlanVersions,
    getPlanVersionById,
    updatePlanVersion,
    deletePlanVersion,
    updatePlanVersionStatus,

    // Plan Node
    createPlanNode,
    getPlanNodes,
    getPlanNodeById,
    updatePlanNode,
    deletePlanNode,
    getPlanHierarchy,
    reorderPlanNodes,
};