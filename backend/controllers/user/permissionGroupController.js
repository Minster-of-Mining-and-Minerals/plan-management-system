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

/**
 * =================== CREATE ===================
 */
const createPermissionGroup = async (req, res) => {
    try {
        const { name, description } = req.body;

        const group = await PermissionGroup.create({
            permission_group_id: uuidv4(),
            name,
            description,
            is_active: true,
        });

        return res.status(201).json({
            message: "Permission group created",
            data: group,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== GET ALL ===================
 */
const getPermissionGroups = async (req, res) => {
    try {
        const groups = await PermissionGroup.findAll({
            include: [
                { model: Permission, as: "permissions" },
                { model: User, as: "users" },
                { model: GovernmentStructure, as: "structures" },
            ],
        });

        return res.json({ data: groups });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== UPDATE ===================
 */
const updatePermissionGroup = async (req, res) => {
    try {
        const { id } = req.params;

        const group = await PermissionGroup.findByPk(id);

        if (!group) {
            return res.status(404).json({ message: "Not found" });
        }

        await group.update(req.body);

        return res.json({ message: "Updated", data: group });
    } catch (error) {
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
// Attach / Detach Government Structures
const addStructuresToGroup = async (req, res) => {
    try {
        const { permission_group_id, government_structure_ids } = req.body;

        const records = government_structure_ids.map((gid) => ({
            id: uuidv4(),
            government_structure_id: gid,
            permission_group_id,
        }));

        await GovernmentStructurePermissionGroup.bulkCreate(records);

        return res.json({ message: "Structures added" });
    } catch (error) {
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
    updatePermissionGroup,
    deletePermissionGroup,
    addPermissionsToGroup,
    removePermissionFromGroup,
    addUsersToGroup,
    removeUserFromGroup,
    addStructuresToGroup,
    removeStructureFromGroup,
};
