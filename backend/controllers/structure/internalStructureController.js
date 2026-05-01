"use strict";

const {
    InternalStructure,
    GovernmentStructure,
    User,
    sequelize,
} = require("../../models");

const { v4: uuidv4, validate: isUuid } = require("uuid");
const { Op } = require("sequelize");

/**
 * =================== CREATE ===================
 */
const createInternalStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, government_structure_id, parent_id, level } = req.body;

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
        const { is_active, search } = req.query;

        const where = {};

        if (is_active !== undefined) {
            where.is_active = is_active === "true";
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
            ];
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

        if (!isUuid(id)) {
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
 * =================== DELETE (SOFT) ===================
 */
const deleteInternalStructure = async (req, res) => {
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

        await structure.update({ is_active: false }, { transaction: t });

        await t.commit();

        return res.json({ message: "Structure deactivated" });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== TOGGLE ACTIVE ===================
 */
const toggleInternalStructureStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const structure = await InternalStructure.findByPk(id);

        if (!structure) {
            return res.status(404).json({ message: "Not found" });
        }

        structure.is_active = !structure.is_active;
        await structure.save();

        return res.json({
            message: `Structure ${structure.is_active ? "activated" : "deactivated"
                }`,
        });
    } catch (error) {
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
    deleteInternalStructure,
    toggleInternalStructureStatus,

    assignUsersToInternalStructure,
    removeUserFromInternalStructure,
};