"use strict";

const {
    InternalStructure,
    GovernmentStructure,
    User,
    sequelize,
} = require("../../models");

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const {
    isValidUuid,
    collectDescendantIds,
    inactiveStructureResponse,
    alreadyActiveResponse,
    inactiveParentBlocksReactivationResponse,
} = require("../../utils/structureLifecycleUtils");

/**
 * =================== CREATE ===================
 */
const createInternalStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        let { name, government_structure_id, parent_id, level } = req.body;

        // If parent is provided, inherit its government_structure_id and calculate level
        if (parent_id) {
            const parent = await InternalStructure.findByPk(parent_id, { transaction: t });
            if (!parent) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Parent structure not found",
                });
            }
            if (!parent.is_active) {
                await t.rollback();
                return inactiveStructureResponse(res, "Parent department");
            }
            government_structure_id = parent.government_structure_id;
            level = parent.level + 1;
        }

        // Validate government structure
        const gov = await GovernmentStructure.findByPk(government_structure_id, {
            transaction: t,
        });

        if (!gov) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Invalid government structure ID",
            });
        }

        if (!gov.is_active) {
            await t.rollback();
            return inactiveStructureResponse(res, "Sector");
        }

        // If creating a root node (parent_id is null), check if one already exists for this gov structure
        if (!parent_id) {
            const rootExists = await InternalStructure.findOne({
                where: {
                    government_structure_id,
                    parent_id: null,
                },
                transaction: t,
            });

            if (rootExists) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "An internal structure root already exists for this government body. You can only create child structures under it.",
                });
            }
        }

        // Check duplicate under same parent
        const existing = await InternalStructure.findOne({
            where: {
                name,
                parent_id: parent_id || null,
            },
            transaction: t,
        });

        if (existing) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Structure with same name already exists under this parent",
            });
        }

        const structure = await InternalStructure.create(
            {
                internal_structure_id: uuidv4(),
                name,
                government_structure_id,
                parent_id: parent_id || null,
                level: level || 1,
                is_active: true,
            },
            { transaction: t }
        );

        await t.commit();

        return res.status(201).json({
            success: true,
            message: "Internal structure created",
            data: structure,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== GET ALL ===================
 */
const getInternalStructures = async (req, res) => {
    try {
        const { is_active, search, government_structure_id, parent_id } = req.query;

        const where = {};

        if (is_active !== undefined) {
            where.is_active = is_active === "true";
        }

        if (government_structure_id) {
            where.government_structure_id = government_structure_id;
        }

        if (parent_id) {
            where.parent_id = parent_id === "null" ? null : parent_id;
        }

        if (search) {
            where[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }];
        }

        const data = await InternalStructure.findAll({
            where,
            include: [
                { model: InternalStructure, as: "children" },
                { model: InternalStructure, as: "parent" },
                { model: GovernmentStructure, as: "governmentStructure" },
            ],
            order: [["created_at", "ASC"]],
        });

        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== GET BY ID ===================
 */
const getInternalStructureById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUuid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const structure = await InternalStructure.findByPk(id, {
            include: [
                { model: InternalStructure, as: "children" },
                { model: InternalStructure, as: "parent" },
                { model: GovernmentStructure, as: "governmentStructure" },
                {
                    model: User,
                    as: "users",
                    attributes: { exclude: ["password"] },
                },
            ],
        });

        if (!structure) {
            return res.status(404).json({ message: "Not found" });
        }

        return res.json({ success: true, data: structure });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== UPDATE ===================
 */
const updateInternalStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        const structure = await InternalStructure.findByPk(id, {
            transaction: t,
        });

        if (!structure) {
            await t.rollback();
            return res.status(404).json({ message: "Not found" });
        }

        if (!structure.is_active) {
            await t.rollback();
            return inactiveStructureResponse(res, "Department");
        }

        const gov = await GovernmentStructure.findByPk(structure.government_structure_id, {
            transaction: t,
        });
        if (gov && !gov.is_active) {
            await t.rollback();
            return inactiveStructureResponse(res, "Sector");
        }

        if (req.body.parent_id) {
            const parent = await InternalStructure.findByPk(req.body.parent_id, {
                transaction: t,
            });
            if (parent && !parent.is_active) {
                await t.rollback();
                return inactiveStructureResponse(res, "Parent department");
            }
        }

        await structure.update(req.body, { transaction: t });

        await t.commit();

        return res.json({
            success: true,
            message: "Updated",
            data: structure,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== REACTIVATE ===================
 */
const reactivateInternalStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isValidUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const structure = await InternalStructure.findByPk(id, {
            transaction: t,
        });

        if (!structure) {
            await t.rollback();
            return res.status(404).json({ message: "Not found" });
        }

        if (structure.is_active) {
            await t.rollback();
            return alreadyActiveResponse(res, "Department");
        }

        const gov = await GovernmentStructure.findByPk(structure.government_structure_id, {
            transaction: t,
        });
        if (gov && !gov.is_active) {
            await t.rollback();
            return inactiveParentBlocksReactivationResponse(res, "Sector");
        }

        if (structure.parent_id) {
            const parent = await InternalStructure.findByPk(structure.parent_id, {
                transaction: t,
            });
            if (parent && !parent.is_active) {
                await t.rollback();
                return inactiveParentBlocksReactivationResponse(res, "Parent department");
            }
        }

        await structure.update({ is_active: true }, { transaction: t });

        await t.commit();

        return res.json({
            success: true,
            message: "Department reactivated successfully",
            data: { internal_structure_id: id, is_active: true },
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== DELETE (SOFT) ===================
 */
const deleteInternalStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isValidUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const structure = await InternalStructure.findByPk(id, {
            transaction: t,
        });

        if (!structure) {
            await t.rollback();
            return res.status(404).json({ message: "Not found" });
        }

        if (!structure.is_active) {
            await t.rollback();
            return res.status(409).json({
                success: false,
                message: "Department is already deactivated.",
            });
        }

        const allStructures = await InternalStructure.findAll({
            where: { government_structure_id: structure.government_structure_id },
            transaction: t,
        });
        const descendantIds = collectDescendantIds(
            id,
            allStructures,
            "internal_structure_id"
        );

        await InternalStructure.update(
            { is_active: false },
            {
                where: {
                    internal_structure_id: {
                        [Op.in]: [id, ...descendantIds],
                    },
                },
                transaction: t,
            }
        );

        await t.commit();

        return res.json({
            success: true,
            message: "Department deactivated successfully",
            data: { internal_structure_id: id, is_active: false },
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== ASSIGN USERS ===================
 */
const assignUsersToInternalStructure = async (req, res) => {
    try {
        const { internal_structure_id, user_ids } = req.body;

        const structure = await InternalStructure.findByPk(
            internal_structure_id
        );

        if (!structure) {
            return res.status(404).json({ message: "Structure not found" });
        }

        if (!structure.is_active) {
            return inactiveStructureResponse(res, "Department");
        }

        const users = await User.findAll({
            where: { user_id: user_ids },
        });

        if (users.length !== user_ids.length) {
            return res.status(400).json({
                message: "Some users not found",
            });
        }

        // Assign by updating FK
        await User.update(
            { internal_structure_id },
            {
                where: { user_id: user_ids },
            }
        );

        return res.json({ message: "Users assigned successfully" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== REMOVE USER ===================
 */
const removeUserFromInternalStructure = async (req, res) => {
    try {
        const { user_id } = req.body;

        const user = await User.findByPk(user_id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.internal_structure_id) {
            const structure = await InternalStructure.findByPk(user.internal_structure_id);
            if (structure && !structure.is_active) {
                return inactiveStructureResponse(res, "Department");
            }
        }

        user.internal_structure_id = null;
        await user.save();

        return res.json({ message: "User removed from structure" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createInternalStructure,
    getInternalStructures,
    getInternalStructureById,
    updateInternalStructure,
    reactivateInternalStructure,
    deleteInternalStructure,

    assignUsersToInternalStructure,
    removeUserFromInternalStructure,
};