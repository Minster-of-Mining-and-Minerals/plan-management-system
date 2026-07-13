"use strict";

const {
    PermissionGroup,
    Permission,
    User,
    GovernmentStructure,
    InternalStructure,
    PermissionGroupPermission,
    UserPermissionGroup,
    GovernmentStructurePermissionGroup,
    InternalStructurePermissionGroup,
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
    assertPermissionIdsAllowedForStructure,
    getPermissionIdsInPermissionGroup,
} = require("../../utils/structureEffectivePermissionsUtils");

function structureScopeOptions(req, transaction) {
    return {
        transaction,
        allowBootstrap: isSuperAdminActor(req),
    };
}
const {
    GROUP_KIND,
    normalizeGroupKind,
    assertPermissionIdsMatchGroupKind,
    assertGroupIsSpecial,
    assertInternalStructuresFitPermissionGroup,
} = require("../../utils/specialPermissionGroupUtils");
const {
    assertCanManagePermissionGroup,
    resolveRequestedGroupKind,
} = require("../../utils/permissionGroupAccessUtils");

const STRUCTURE_INCLUDE = {
    model: GovernmentStructure,
    as: "structures",
    include: [
        {
            model: GovernmentStructure,
            as: "parent",
            attributes: ["government_structure_id", "name", "level", "parent_id"],
        },
    ],
};

const INTERNAL_STRUCTURE_INCLUDE = {
    model: InternalStructure,
    as: "internalStructures",
    attributes: [
        "internal_structure_id",
        "government_structure_id",
        "parent_id",
        "name",
        "level",
        "is_active",
    ],
};

async function getPermissionGroupIdsForStructure(structureId) {
    const links = await GovernmentStructurePermissionGroup.findAll({
        where: { government_structure_id: structureId },
        attributes: ["permission_group_id"],
    });
    return links.map((link) => link.permission_group_id);
}

async function getPermissionGroupKind(permissionGroupId, options = {}) {
    const group = await PermissionGroup.findByPk(permissionGroupId, {
        attributes: ["group_kind"],
        transaction: options.transaction,
    });

    if (!group) {
        const error = new Error("Permission group not found.");
        error.status = 404;
        throw error;
    }

    return normalizeGroupKind(group.group_kind);
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
        const {
            name,
            description,
            permission_ids,
            group_kind,
            government_structure_id: bodyStructureId,
        } = req.body;
        const normalizedGroupKind = normalizeGroupKind(group_kind);

        assertCanManagePermissionGroup(req.user, normalizedGroupKind, "create");

        let structureId;
        try {
            structureId = resolveManageableStructureId(req, bodyStructureId);
        } catch (error) {
            await t.rollback();
            return sendScopeError(res, error);
        }

        if (permission_ids?.length) {
            await assertPermissionIdsMatchGroupKind(permission_ids, normalizedGroupKind, {
                transaction: t,
            });
        }

        if (structureId && permission_ids?.length) {
            await assertPermissionIdsAllowedForStructure(permission_ids, structureId, {
                transaction: t,
                allowBootstrap: isSuperAdminActor(req),
            });
        }

        const group = await PermissionGroup.create({
            permission_group_id: uuidv4(),
            name,
            description,
            is_active: true,
            group_kind: normalizedGroupKind,
        }, { transaction: t });

        if (permission_ids && permission_ids.length > 0) {
            const records = permission_ids.map((pid) => ({
                permission_group_id: group.permission_group_id,
                permission_id: pid,
                created_at: new Date(),
            }));
            await PermissionGroupPermission.bulkCreate(records, { transaction: t });
        }

        if (structureId) {
            await GovernmentStructurePermissionGroup.create({
                id: uuidv4(),
                government_structure_id: structureId,
                permission_group_id: group.permission_group_id,
            }, { transaction: t });
        }

        await t.commit();

        return res.status(201).json({
            message: "Permission group created",
            data: group,
        });
    } catch (error) {
        if (!t.finished) await t.rollback();
        if (error.status) {
            return sendScopeError(res, error);
        }
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== GET ALL ===================
 */
const getPermissionGroups = async (req, res) => {
    try {
        const { government_structure_id: queryStructureId, is_active, group_kind } = req.query;
        const normalizedGroupKind = resolveRequestedGroupKind(group_kind, undefined, GROUP_KIND.STANDARD);

        assertCanManagePermissionGroup(req.user, normalizedGroupKind, "read");

        let structureId;
        try {
            structureId = resolveManageableStructureId(req, queryStructureId);
        } catch (error) {
            return sendScopeError(res, error);
        }

        const where = {
            group_kind: normalizedGroupKind,
        };

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
                STRUCTURE_INCLUDE,
                INTERNAL_STRUCTURE_INCLUDE,
            ],
            order: [["created_at", "DESC"]],
        });

        return res.json({ data: groups });
    } catch (error) {
        if (error.status) {
            return sendScopeError(res, error);
        }
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

        const groupKind = await getPermissionGroupKind(id);
        assertCanManagePermissionGroup(req.user, groupKind, "read");

        const group = await PermissionGroup.findByPk(id, {
            include: [
                { model: Permission, as: "permissions" },
                { model: User, as: "users" },
                STRUCTURE_INCLUDE,
                INTERNAL_STRUCTURE_INCLUDE,
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
        if (error.status) {
            return sendScopeError(res, error);
        }
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
        const { name, description, permission_ids, is_active, government_structure_id: bodyStructureId, group_kind } =
            req.body;

        const group = await PermissionGroup.findByPk(id, { transaction: t });

        if (!group) {
            await t.rollback();
            return res.status(404).json({ message: "Not found" });
        }

        assertCanManagePermissionGroup(req.user, group.group_kind, "update");

        try {
            await assertPermissionGroupAccessible(id, req, bodyStructureId);
        } catch (error) {
            await t.rollback();
            return sendScopeError(res, error);
        }

        const nextGroupKind =
            group_kind !== undefined ? normalizeGroupKind(group_kind) : group.group_kind;

        if (Array.isArray(permission_ids)) {
            await assertPermissionIdsMatchGroupKind(permission_ids, nextGroupKind, {
                transaction: t,
            });
        } else if (group_kind !== undefined && nextGroupKind !== group.group_kind) {
            const existingIds = await getPermissionIdsInPermissionGroup(id, { transaction: t });
            await assertPermissionIdsMatchGroupKind(existingIds, nextGroupKind, {
                transaction: t,
            });
        }

        await group.update({
            name: name || group.name,
            description: description || group.description,
            is_active: is_active !== undefined ? is_active : group.is_active,
            group_kind: nextGroupKind,
        }, { transaction: t });

        if (Array.isArray(permission_ids)) {
            await assertPermissionIdsFitLinkedStructureHierarchies(id, permission_ids, {
                ...structureScopeOptions(req, t),
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

        assertCanManagePermissionGroup(req.user, group.group_kind, "delete");

        try {
            await assertPermissionGroupAccessible(id, req, queryStructureId);
        } catch (error) {
            return sendScopeError(res, error);
        }

        await group.destroy();

        return res.json({ message: "Deleted" });
    } catch (error) {
        if (error.status) {
            return sendScopeError(res, error);
        }
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== ADD PERMISSIONS ===================
 */
const addPermissionsToGroup = async (req, res) => {
    try {
        const { permission_group_id, permission_ids } = req.body;

        const group = await PermissionGroup.findByPk(permission_group_id);
        if (!group) {
            return res.status(404).json({ message: "Permission group not found" });
        }

        assertCanManagePermissionGroup(req.user, group.group_kind, "addPermissions");

        const existingIds = await getPermissionIdsInPermissionGroup(permission_group_id);
        const mergedIds = [...new Set([...existingIds, ...permission_ids])];

        await assertPermissionIdsMatchGroupKind(mergedIds, group.group_kind);
        await assertPermissionIdsFitLinkedStructureHierarchies(
            permission_group_id,
            mergedIds,
            structureScopeOptions(req)
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

        const groupKind = await getPermissionGroupKind(permission_group_id);
        assertCanManagePermissionGroup(req.user, groupKind, "removePermission");

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

        const groupKind = await getPermissionGroupKind(permission_group_id);
        assertCanManagePermissionGroup(req.user, groupKind, "addUsers");

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

        const structureIndex = await GovernmentStructure.findAll({
            attributes: ["government_structure_id", "parent_id"],
        });

        for (const user of users) {
            try {
                assertUserInStructure(
                    user,
                    user.government_structure_id,
                    req,
                    structureIndex
                );
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
        if (error.status) {
            return sendScopeError(res, error);
        }
        return res.status(500).json({ error: error.message });
    }
};

const removeUserFromGroup = async (req, res) => {
    try {
        const { permission_group_id, user_id } = req.body;

        const groupKind = await getPermissionGroupKind(permission_group_id);
        assertCanManagePermissionGroup(req.user, groupKind, "removeUser");

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

        const groupKind = await getPermissionGroupKind(permission_group_id);
        assertCanManagePermissionGroup(req.user, groupKind, "addStructures");

        for (const governmentStructureId of government_structure_ids) {
            await assertPermissionGroupFitsStructureHierarchy(
                permission_group_id,
                governmentStructureId,
                structureScopeOptions(req)
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

        const groupKind = await getPermissionGroupKind(permission_group_id);
        assertCanManagePermissionGroup(req.user, groupKind, "removeStructure");

        await GovernmentStructurePermissionGroup.destroy({
            where: { permission_group_id, government_structure_id },
        });

        return res.json({ message: "Structure removed" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const addDepartmentsToGroup = async (req, res) => {
    try {
        const { permission_group_id, internal_structure_ids } = req.body;

        const groupKind = await getPermissionGroupKind(permission_group_id);
        assertCanManagePermissionGroup(req.user, groupKind, "addDepartments");

        await assertGroupIsSpecial(permission_group_id);
        await assertInternalStructuresFitPermissionGroup(
            permission_group_id,
            internal_structure_ids
        );

        const records = internal_structure_ids.map((internalStructureId) => ({
            id: uuidv4(),
            internal_structure_id: internalStructureId,
            permission_group_id,
        }));

        await InternalStructurePermissionGroup.bulkCreate(records, {
            ignoreDuplicates: true,
        });

        return res.json({ message: "Departments added" });
    } catch (error) {
        if (error.status) {
            return sendScopeError(res, error);
        }
        return res.status(500).json({ error: error.message });
    }
};

const removeDepartmentFromGroup = async (req, res) => {
    try {
        const { permission_group_id, internal_structure_id } = req.body;

        const groupKind = await getPermissionGroupKind(permission_group_id);
        assertCanManagePermissionGroup(req.user, groupKind, "removeDepartment");

        await assertGroupIsSpecial(permission_group_id);

        await InternalStructurePermissionGroup.destroy({
            where: { permission_group_id, internal_structure_id },
        });

        return res.json({ message: "Department removed" });
    } catch (error) {
        if (error.status) {
            return sendScopeError(res, error);
        }
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
    addDepartmentsToGroup,
    removeDepartmentFromGroup,
};
