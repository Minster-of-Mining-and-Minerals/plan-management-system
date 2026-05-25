"use strict";

const {
    PermissionGroup,
    Permission,
    User,
    PermissionGroupPermission,
    UserPermissionGroup,
} = require("../../models");

const { v4: uuidv4 } = require("uuid");
const { enrichPermissionGroupWithStrength } = require("../../utils/roleStrength");

const permissionInclude = {
    model: Permission,
    as: "permissions",
    where: { is_active: true },
    required: false,
    attributes: ["permission_id", "resource", "action"],
};

async function getTotalActivePermissions() {
    return Permission.count({ where: { is_active: true } });
}

async function fetchGroupWithRelations(id) {
    return PermissionGroup.findByPk(id, {
        include: [
            permissionInclude,
            { model: User, as: "users" },
        ],
    });
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

        const totalPermissions = await getTotalActivePermissions();
        const createdGroup = await fetchGroupWithRelations(group.permission_group_id);

        return res.status(201).json({
            message: "Permission group created",
            data: enrichPermissionGroupWithStrength(createdGroup, totalPermissions),
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
        const totalPermissions = await getTotalActivePermissions();

        const groups = await PermissionGroup.findAll({
            include: [
                permissionInclude,
                { model: User, as: "users" },
            ],
            order: [["created_at", "DESC"]],
        });

        const data = groups.map((group) =>
            enrichPermissionGroupWithStrength(group, totalPermissions)
        );

        return res.json({ data });
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
        const group = await fetchGroupWithRelations(id);

        if (!group) {
            return res.status(404).json({ message: "Not found" });
        }

        const totalPermissions = await getTotalActivePermissions();

        return res.json({
            data: enrichPermissionGroupWithStrength(group, totalPermissions),
        });
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
        const { name, description, permission_ids, is_active } = req.body;

        const group = await PermissionGroup.findByPk(id, { transaction: t });

        if (!group) {
            await t.rollback();
            return res.status(404).json({ message: "Not found" });
        }

        await group.update({
            name: name || group.name,
            description: description || group.description,
            is_active: is_active !== undefined ? is_active : group.is_active,
        }, { transaction: t });

        if (Array.isArray(permission_ids)) {
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

        const totalPermissions = await getTotalActivePermissions();
        const updatedGroup = await fetchGroupWithRelations(id);

        return res.json({
            message: "Updated",
            data: enrichPermissionGroupWithStrength(updatedGroup, totalPermissions),
        });
    } catch (error) {
        if (!t.finished) await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== DELETE ===================
 */
const deletePermissionGroup = async (req, res) => {
    try {
        const { id } = req.params;

        const group = await PermissionGroup.findByPk(id);

        if (!group) {
            return res.status(404).json({ message: "Not found" });
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

        const records = permission_ids.map((pid) => ({
            permission_group_id,
            permission_id: pid,
            created_at: new Date(),
        }));

        await PermissionGroupPermission.bulkCreate(records);

        return res.json({ message: "Permissions added" });
    } catch (error) {
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
};
