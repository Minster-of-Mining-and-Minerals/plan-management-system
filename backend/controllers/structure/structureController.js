"use strict";

const {
    Structure,
    User,
    PermissionGroup,
    StructurePermissionGroup,
    sequelize,
} = require("../../models");

const { v4: uuidv4, validate: isUuid } = require("uuid");
const { Op } = require("sequelize");

/**
 * =================== CREATE ===================
 */
const createStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, parent_id, level } = req.body;

        // Prevent duplicate under same parent
        const existing = await Structure.findOne({
            where: { name, parent_id: parent_id || null },
            transaction: t,
        });

        if (existing) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Structure already exists under the same parent.",
            });
        }

        const structure = await Structure.create(
            {
                structure_id: uuidv4(),
                name,
                parent_id: parent_id || null,
                level: level || 1,
                is_active: true,
            },
            { transaction: t }
        );

        await t.commit();

        return res.status(201).json({
            success: true,
            message: "Structure created",
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
const getStructures = async (req, res) => {
    try {
        const { is_active, search, parent_id } = req.query;

        const where = {};

        if (is_active !== undefined) {
            where.is_active = is_active === "true";
        }

        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }

        let structures = await Structure.findAll({
            where,
            include: [
                { model: Structure, as: "parent" },
                { model: Structure, as: "children" },
                {
                    model: User,
                    as: "users",
                    attributes: { exclude: ["password"] },
                },
                {
                    model: PermissionGroup,
                    as: "permissionGroups",
                },
            ],
            order: [["created_at", "ASC"]],
        });

        if (parent_id) {
            // Helper function to recursively find all descendants
            const getDescendants = (pid, all) => {
                let results = all.filter((s) => s.parent_id === pid);
                let children = [];
                for (let child of results) {
                    children = children.concat(
                        getDescendants(child.structure_id, all)
                    );
                }
                return results.concat(children);
            };

            const root = structures.find(
                (s) => s.structure_id === parent_id
            );
            if (root) {
                const descendants = getDescendants(parent_id, structures);
                structures = [root, ...descendants];
            } else {
                structures = [];
            }
        }

        return res.json({
            success: true,
            data: structures,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== GET BY ID ===================
 */
const getStructureById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const structure = await Structure.findByPk(id, {
            include: [
                { model: Structure, as: "parent" },
                { model: Structure, as: "children" },
                {
                    model: User,
                    as: "users",
                    attributes: { exclude: ["password"] },
                },
                {
                    model: PermissionGroup,
                    as: "permissionGroups",
                },
            ],
        });

        if (!structure) {
            return res.status(404).json({ message: "Not found" });
        }

        return res.json({
            success: true,
            data: structure,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== UPDATE ===================
 */
const updateStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const structure = await Structure.findByPk(id, {
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
const deleteStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const structure = await Structure.findByPk(id, {
            transaction: t,
        });

        if (!structure) {
            await t.rollback();
            return res.status(404).json({ message: "Not found" });
        }

        await structure.update(
            { is_active: false },
            { transaction: t }
        );

        await t.commit();

        return res.json({ message: "Deactivated successfully" });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

//////////////////////////////////////////////////////////////////
// ✅ USERS MANAGEMENT
//////////////////////////////////////////////////////////////////

const addUsersToStructure = async (req, res) => {
    try {
        const { structure_id, user_ids } = req.body;

        await User.update(
            { structure_id },
            {
                where: { user_id: user_ids },
            }
        );

        return res.json({ message: "Users assigned to structure" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const removeUserFromStructure = async (req, res) => {
    try {
        const { user_id } = req.body;

        await User.update(
            { structure_id: null },
            {
                where: { user_id },
            }
        );

        return res.json({ message: "User removed from structure" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

//////////////////////////////////////////////////////////////////
// ✅ PERMISSION GROUP MANAGEMENT
//////////////////////////////////////////////////////////////////

const addPermissionGroupsToStructure = async (req, res) => {
    try {
        const { structure_id, permission_group_ids } = req.body;

        const records = permission_group_ids.map((pid) => ({
            id: uuidv4(),
            structure_id,
            permission_group_id: pid,
        }));

        await StructurePermissionGroup.bulkCreate(records);

        return res.json({ message: "Permission groups added" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const removePermissionGroupFromStructure = async (req, res) => {
    try {
        const { structure_id, permission_group_id } = req.body;

        await StructurePermissionGroup.destroy({
            where: { structure_id, permission_group_id },
        });

        return res.json({ message: "Permission group removed" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createStructure,
    getStructures,
    getStructureById,
    updateStructure,
    deleteStructure,
    addUsersToStructure,
    removeUserFromStructure,
    addPermissionGroupsToStructure,
    removePermissionGroupFromStructure,
};