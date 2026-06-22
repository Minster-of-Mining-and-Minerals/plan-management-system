"use strict";

const {
    GovernmentStructure,
    User,
    PermissionGroup,
    GovernmentStructurePermissionGroup,
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
const {
    assertPermissionGroupsFitStructureHierarchy,
} = require("../../utils/structureEffectivePermissionsUtils");
const { sendScopeError } = require("../../utils/structureScopeUtils");

/**
 * =================== CREATE ===================
 */
const createGovernmentStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, parent_id, level } = req.body;

        if (parent_id) {
            const parent = await GovernmentStructure.findByPk(parent_id, { transaction: t });
            if (!parent) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Parent sector not found.",
                });
            }
            if (!parent.is_active) {
                await t.rollback();
                return inactiveStructureResponse(res, "Parent sector");
            }
        }

        // Prevent duplicate under same parent
        const existing = await GovernmentStructure.findOne({
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

        const structure = await GovernmentStructure.create(
            {
                government_structure_id: uuidv4(),
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
            message: "Government structure created",
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
const getGovernmentStructures = async (req, res) => {
    try {
        const { is_active, search, parent_id } = req.query;

        const where = {};

        if (is_active !== undefined) {
            where.is_active = is_active === "true";
        }

        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }

        let structures = await GovernmentStructure.findAll({
            where,
            include: [
                { model: GovernmentStructure, as: "parent" },
                { model: GovernmentStructure, as: "children" },
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
                        getDescendants(child.government_structure_id, all)
                    );
                }
                return results.concat(children);
            };

            const root = structures.find(
                (s) => s.government_structure_id === parent_id
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
const getGovernmentStructureById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUuid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const structure = await GovernmentStructure.findByPk(id, {
            include: [
                { model: GovernmentStructure, as: "parent" },
                { model: GovernmentStructure, as: "children" },
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
const updateGovernmentStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isValidUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const structure = await GovernmentStructure.findByPk(id, {
            transaction: t,
        });

        if (!structure) {
            await t.rollback();
            return res.status(404).json({ message: "Not found" });
        }

        if (!structure.is_active) {
            await t.rollback();
            return inactiveStructureResponse(res, "Sector");
        }

        if (req.body.parent_id) {
            const parent = await GovernmentStructure.findByPk(req.body.parent_id, {
                transaction: t,
            });
            if (parent && !parent.is_active) {
                await t.rollback();
                return inactiveStructureResponse(res, "Parent sector");
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
const reactivateGovernmentStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isValidUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const structure = await GovernmentStructure.findByPk(id, {
            transaction: t,
        });

        if (!structure) {
            await t.rollback();
            return res.status(404).json({ message: "Not found" });
        }

        if (structure.is_active) {
            await t.rollback();
            return alreadyActiveResponse(res, "Sector");
        }

        if (structure.parent_id) {
            const parent = await GovernmentStructure.findByPk(structure.parent_id, {
                transaction: t,
            });
            if (parent && !parent.is_active) {
                await t.rollback();
                return inactiveParentBlocksReactivationResponse(res, "Parent sector");
            }
        }

        await structure.update({ is_active: true }, { transaction: t });

        await t.commit();

        return res.json({
            success: true,
            message: "Sector reactivated successfully",
            data: { government_structure_id: id, is_active: true },
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== DELETE (SOFT) ===================
 */
const deleteGovernmentStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isValidUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const structure = await GovernmentStructure.findByPk(id, {
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
                message: "Sector is already deactivated.",
            });
        }

        const allStructures = await GovernmentStructure.findAll({ transaction: t });
        const descendantIds = collectDescendantIds(
            id,
            allStructures,
            "government_structure_id"
        );

        await GovernmentStructure.update(
            { is_active: false },
            {
                where: {
                    government_structure_id: {
                        [Op.in]: [id, ...descendantIds],
                    },
                },
                transaction: t,
            }
        );

        await t.commit();

        return res.json({
            success: true,
            message: "Sector deactivated successfully",
            data: { government_structure_id: id, is_active: false },
        });
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
        const { government_structure_id, user_ids } = req.body;

        const structure = await GovernmentStructure.findByPk(government_structure_id);
        if (!structure) {
            return res.status(404).json({ message: "Sector not found" });
        }
        if (!structure.is_active) {
            return inactiveStructureResponse(res, "Sector");
        }

        await User.update(
            { government_structure_id },
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

        const user = await User.findByPk(user_id);
        if (user?.government_structure_id) {
            const structure = await GovernmentStructure.findByPk(user.government_structure_id);
            if (structure && !structure.is_active) {
                return inactiveStructureResponse(res, "Sector");
            }
        }

        await User.update(
            { government_structure_id: null },
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
        const { government_structure_id, permission_group_ids } = req.body;

        const structure = await GovernmentStructure.findByPk(government_structure_id);
        if (!structure) {
            return res.status(404).json({ message: "Sector not found" });
        }
        if (!structure.is_active) {
            return inactiveStructureResponse(res, "Sector");
        }

        await assertPermissionGroupsFitStructureHierarchy(
            permission_group_ids,
            government_structure_id
        );

        const records = permission_group_ids.map((pid) => ({
            id: uuidv4(),
            government_structure_id,
            permission_group_id: pid,
        }));

        await GovernmentStructurePermissionGroup.bulkCreate(records);

        return res.json({ message: "Permission groups added" });
    } catch (error) {
        if (error.status) {
            return sendScopeError(res, error);
        }
        return res.status(500).json({ error: error.message });
    }
};

const removePermissionGroupFromStructure = async (req, res) => {
    try {
        const { government_structure_id, permission_group_id } = req.body;

        const structure = await GovernmentStructure.findByPk(government_structure_id);
        if (!structure) {
            return res.status(404).json({ message: "Sector not found" });
        }
        if (!structure.is_active) {
            return inactiveStructureResponse(res, "Sector");
        }

        await GovernmentStructurePermissionGroup.destroy({
            where: { government_structure_id, permission_group_id },
        });

        return res.json({ message: "Permission group removed" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createGovernmentStructure,
    getGovernmentStructures,
    getGovernmentStructureById,
    updateGovernmentStructure,
    reactivateGovernmentStructure,
    deleteGovernmentStructure,
    addUsersToStructure,
    removeUserFromStructure,
    addPermissionGroupsToStructure,
    removePermissionGroupFromStructure,
};