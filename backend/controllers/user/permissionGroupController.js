"use strict";

const {
    PermissionGroup,
    Permission,
    User,
    GovernmentStructure,
    PermissionGroupPermission,
    UserPermissionGroup,
    GovernmentStructurePermissionGroup,
} = require("../../models");

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const {
    isSuperAdminActor,
    resolveManageableStructureId,
    sendScopeError,
} = require("../../utils/structureScopeUtils");
const {
    assertPermissionGroupsFitStructureHierarchy,
    assertPermissionGroupFitsStructureHierarchy,
    assertPermissionIdsFitLinkedStructureHierarchies,
    getPermissionIdsInPermissionGroup,
} = require("../../utils/structureEffectivePermissionsUtils");

async function getPermissionGroupIdsForStructure(structureId) {
    const links = await GovernmentStructurePermissionGroup.findAll({
        where: { government_structure_id: structureId },
        attributes: ["permission_group_id"],
    });
    return links.map((link) => link.permission_group_id);
}

async function assertPermissionGroupAccessible(permissionGroupId, req, structureId) {
    if (isSuperAdminActor(req) && !structureId) {
        return;
    }

    let effectiveStructureId;
    try {
        effectiveStructureId = resolveManageableStructureId(req, structureId);
    } catch (error) {
        throw error;
    }

    if (!effectiveStructureId) {
        const error = new Error("Structure context is required.");
        error.status = 403;
        throw error;
    }

    const link = await GovernmentStructurePermissionGroup.findOne({
        where: {
            permission_group_id: permissionGroupId,
            government_structure_id: effectiveStructureId,
        },
    });

    if (!link) {
        const error = new Error(
            "Access denied: permission group is not assigned to this structure."
        );
        error.status = 403;
        throw error;
    }
}

/**
 * =================== CREATE ===================
 */
const createPermissionGroup = async (req, res) => {
    const t = await PermissionGroup.sequelize.transaction();
    try {
        const { name, description, permission_ids } = req.body;

        const group = await PermissionGroup.create({
            permission_group_id: uuidv4(),
            name,
            description,
            is_active: true,
        }, { transaction: t });

        if (permission_ids && permission_ids.length > 0) {
            const records = permission_ids.map((pid) => ({
                permission_group_id: group.permission_group_id,
                permission_id: pid,
                created_at: new Date(),
            }));
            await PermissionGroupPermission.bulkCreate(records, { transaction: t });
        }

        await t.commit();

        return res.status(201).json({
            message: "Permission group created",
            data: group,
        });
    } catch (error) {
        if (!t.finished) await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== GET ALL ===================
 */
const getPermissionGroups = async (req, res) => {
    try {
        const { government_structure_id: queryStructureId, is_active } = req.query;

        let structureId;
        try {
            structureId = resolveManageableStructureId(req, queryStructureId);
        } catch (error) {
            return sendScopeError(res, error);
        }

        const where = {};

        if (is_active !== undefined) {
            where.is_active = is_active === "true";
        }

        if (structureId) {
            const groupIds = await getPermissionGroupIdsForStructure(structureId);
            if (groupIds.length === 0) {
                return res.json({ data: [] });
            }
            where.permission_group_id = { [Op.in]: groupIds };
        } else if (!isSuperAdminActor(req)) {
            return sendScopeError(res, {
                status: 403,
                message: "Access denied: structure context is required.",
            });
        }

        const groups = await PermissionGroup.findAll({
            where,
            include: [
                { model: Permission, as: "permissions" },
                { model: User, as: "users" },
                { model: GovernmentStructure, as: "structures" },
            ],
            order: [["created_at", "DESC"]],
        });

        return res.json({ data: groups });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== GET BY ID ===================
 */
const getPermissionGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const { government_structure_id: queryStructureId } = req.query;

        const group = await PermissionGroup.findByPk(id, {
            include: [
                { model: Permission, as: "permissions" },
                { model: User, as: "users" },
                { model: GovernmentStructure, as: "structures" },
            ],
        });

        if (!group) {
            return res.status(404).json({ message: "Not found" });
        }

        try {
            await assertPermissionGroupAccessible(id, req, queryStructureId);
        } catch (error) {
            return sendScopeError(res, error);
        }

        return res.json({ data: group });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== UPDATE ===================
 */
const updatePermissionGroup = async (req, res) => {
    const t = await PermissionGroup.sequelize.transaction();
    try {
        const { id } = req.params;
        const { name, description, permission_ids, is_active, government_structure_id: bodyStructureId } =
            req.body;

        const group = await PermissionGroup.findByPk(id, { transaction: t });

        if (!group) {
            await t.rollback();
            return res.status(404).json({ message: "Not found" });
        }

        try {
            await assertPermissionGroupAccessible(id, req, bodyStructureId);
        } catch (error) {
            await t.rollback();
            return sendScopeError(res, error);
        }

        await group.update({
            name: name || group.name,
            description: description || group.description,
            is_active: is_active !== undefined ? is_active : group.is_active,
        }, { transaction: t });

        if (Array.isArray(permission_ids)) {
            await assertPermissionIdsFitLinkedStructureHierarchies(id, permission_ids, {
                transaction: t,
            });

            // Remove existing permissions
            await PermissionGroupPermission.destroy({
                where: { permission_group_id: id },
                transaction: t,
            });

            // Add new permissions
            if (permission_ids.length > 0) {
                const records = permission_ids.map((pid) => ({
                    permission_group_id: id,
                    permission_id: pid,
                    created_at: new Date(),
                }));
                await PermissionGroupPermission.bulkCreate(records, { transaction: t });
            }
        }

        await t.commit();

        return res.json({ message: "Updated", data: group });
    } catch (error) {
        if (!t.finished) await t.rollback();
        if (error.status) {
            return sendScopeError(res, error);
        }
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== DELETE ===================
 */
const deletePermissionGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { government_structure_id: queryStructureId } = req.query;

        const group = await PermissionGroup.findByPk(id);

        if (!group) {
            return res.status(404).json({ message: "Not found" });
        }

        try {
            await assertPermissionGroupAccessible(id, req, queryStructureId);
        } catch (error) {
            return sendScopeError(res, error);
        }

        await group.destroy();

        return res.json({ message: "Deleted" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== ADD PERMISSIONS ===================
 */
const addPermissionsToGroup = async (req, res) => {
    try {
        const { permission_group_id, permission_ids } = req.body;

        const existingIds = await getPermissionIdsInPermissionGroup(permission_group_id);
        const mergedIds = [...new Set([...existingIds, ...permission_ids])];
        await assertPermissionIdsFitLinkedStructureHierarchies(
            permission_group_id,
            mergedIds
        );

        const records = permission_ids.map((pid) => ({
            permission_group_id,
            permission_id: pid,
            created_at: new Date(),
        }));

        await PermissionGroupPermission.bulkCreate(records);

        return res.json({ message: "Permissions added" });
    } catch (error) {
        if (error.status) {
            return sendScopeError(res, error);
        }
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== REMOVE PERMISSION ===================
 */
const removePermissionFromGroup = async (req, res) => {
    try {
        const { permission_group_id, permission_id } = req.body;

        await PermissionGroupPermission.destroy({
            where: { permission_group_id, permission_id },
        });

        return res.json({ message: "Permission removed" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
// USER GROUP ADD AND REMOVE
const addUsersToGroup = async (req, res) => {
    try {
        const { permission_group_id, user_ids } = req.body;
        const {
            assertUserInStructure,
            sendScopeError,
        } = require("../../utils/structureScopeUtils");

        const structureLinks = await GovernmentStructurePermissionGroup.findAll({
            where: { permission_group_id },
        });
        const allowedStructureIds = new Set(
            structureLinks.map((link) => link.government_structure_id)
        );

        if (allowedStructureIds.size === 0) {
            return res.status(400).json({
                message: "Permission group is not assigned to any structure.",
            });
        }

        const users = await User.findAll({ where: { user_id: user_ids } });
        if (users.length !== user_ids.length) {
            return res.status(400).json({ message: "One or more users were not found." });
        }

        for (const user of users) {
            try {
                assertUserInStructure(user, user.government_structure_id, req);
            } catch (error) {
                return sendScopeError(res, error);
            }

            if (!allowedStructureIds.has(user.government_structure_id)) {
                return res.status(403).json({
                    message: "User structure does not have access to this permission group.",
                });
            }
        }

        const records = user_ids.map((uid) => ({
            id: uuidv4(),
            user_id: uid,
            permission_group_id,
        }));

        await UserPermissionGroup.bulkCreate(records);

        return res.json({ message: "Users added" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const removeUserFromGroup = async (req, res) => {
    try {
        const { permission_group_id, user_id } = req.body;

        await UserPermissionGroup.destroy({
            where: { permission_group_id, user_id },
        });

        return res.json({ message: "User removed" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
// Attach / Detach Government Structures
const addStructuresToGroup = async (req, res) => {
    try {
        const { permission_group_id, government_structure_ids } = req.body;

        for (const governmentStructureId of government_structure_ids) {
            await assertPermissionGroupFitsStructureHierarchy(
                permission_group_id,
                governmentStructureId
            );
        }

        const records = government_structure_ids.map((gid) => ({
            id: uuidv4(),
            government_structure_id: gid,
            permission_group_id,
        }));

        await GovernmentStructurePermissionGroup.bulkCreate(records);

        return res.json({ message: "Structures added" });
    } catch (error) {
        if (error.status) {
            return sendScopeError(res, error);
        }
        return res.status(500).json({ error: error.message });
    }
};

const removeStructureFromGroup = async (req, res) => {
    try {
        const { permission_group_id, government_structure_id } = req.body;

        await GovernmentStructurePermissionGroup.destroy({
            where: { permission_group_id, government_structure_id },
        });

        return res.json({ message: "Structure removed" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
module.exports = {
    createPermissionGroup,
    getPermissionGroups,
    getPermissionGroupById,
    updatePermissionGroup,
    deletePermissionGroup,
    addPermissionsToGroup,
    removePermissionFromGroup,
    addUsersToGroup,
    removeUserFromGroup,
    addStructuresToGroup,
    removeStructureFromGroup,
};
