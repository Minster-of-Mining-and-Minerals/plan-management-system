const { RolePermission, Role, Permission } = require("../../models");
const { v4: uuidv4 } = require("uuid");

// Assign permission(s) to a role
const assignPermissionsToRole = async (req, res) => {
  try {
    const { role_id, permission_ids } = req.body;

    if (!Array.isArray(permission_ids) || permission_ids.length === 0) {
      return res.status(400).json({ message: "No permissions provided." });
    }

    const assignments = permission_ids.map((permission_id) =>
      RolePermission.create({
        role_permission_id: uuidv4(),
        role_id,
        permission_id,
        is_active: true,
      })
    );

    await Promise.all(assignments);

    const roleWithPermissions = await Role.findOne({
      where: { role_id },
      include: {
        model: Permission,
        as: "permissions",
        through: { attributes: ["is_active"] },
      },
    });

    res.status(201).json(roleWithPermissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get all role-permissions
const getRolePermissions = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: {
        model: Permission,
        as: "permissions",
        through: { attributes: ["is_active"] },
      },
    });

    res.status(200).json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Update a permission for a role
const updateRolePermission = async (req, res) => {
  try {
    const { role_permission_id, is_active } = req.body;

    const rolePermission = await RolePermission.findByPk(role_permission_id);
    if (!rolePermission) {
      return res.status(404).json({ message: "Role-Permission not found." });
    }

    rolePermission.is_active = is_active;
    await rolePermission.save();

    res.status(200).json(rolePermission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Remove permission from a role
const removePermissionFromRole = async (req, res) => {
  try {
    const { role_permission_id } = req.params;

    const deleted = await RolePermission.destroy({ where: { role_permission_id } });

    if (!deleted) {
      return res.status(404).json({ message: "Role-Permission not found." });
    }

    res.status(200).json({ message: "Permission removed from role successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

module.exports = {
  assignPermissionsToRole,
  getRolePermissions,
  updateRolePermission,
  removePermissionFromRole,
};