// controllers/roleController.js
const { Role, Permission, RolePermission } = require("../../models");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const { Sequelize } = require("sequelize");

const createRole = async (req, res) => {
  const t = await Role.sequelize.transaction();
  try {
    const { name, description, permission_ids } = req.body;

    // ====== Check if role exists ======
    const existing = await Role.findOne({ where: { name }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Role name already exists",
      });
    }

    // ====== Create Role ======
    const role = await Role.create(
      {
        role_id: uuidv4(),
        name,
        description,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    // ====== Assign permissions directly to role if no sub-roles ======
    if (permission_ids && permission_ids.length > 0) {
      let permissionIds = permission_ids;
      if (typeof permissionIds === "string") {
        try {
          permissionIds = JSON.parse(permissionIds);
        } catch {
          permissionIds = permissionIds.split(",").map((i) => i.trim());
        }
      }

      const validPermissions = await Permission.findAll({
        where: { permission_id: permissionIds, is_active: true },
        transaction: t,
      });

      if (validPermissions.length !== permissionIds.length) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Some permissions are invalid for role",
        });
      }

      const rolePermissions = permissionIds.map((pid) => ({
        role_permission_id: uuidv4(),
        role_id: role.role_id,
        permission_id: pid,
        assigned_by: "8993455e-312b-433f-b8d7-15491875d38a",
        assigned_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await RolePermission.bulkCreate(rolePermissions, { transaction: t });
    }

    await t.commit();

    // ====== Fetch role with sub-roles and permissions ======
    const createdRole = await Role.findOne({
      where: { role_id: role.role_id },
      include: [
        {
          model: RolePermission,
          as: "rolePermissions",
          required: false,
          include: [
            {
              model: Permission,
              as: "permission",
              attributes: ["permission_id", "resource", "action"],
            },
          ],
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message:
        "Role created successfully (with sub-roles or direct permissions)",
      data: createdRole,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error creating role:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating role",
      error: error.message,
    });
  }
};

// Get all roles with sub-roles and permissions
const getRoles = async (req, res) => {
  try {
    const { is_active } = req.query; // expecting query params

    // Build dynamic where clause
    const whereClause = {};

    if (is_active !== undefined) whereClause.is_active = is_active === "true";

    const roles = await Role.findAll({
      where: whereClause,
      include: [
        {
          model: RolePermission,
          as: "rolePermissions",
          required: false,
          include: [
            {
              model: Permission,
              as: "permission",
              attributes: ["permission_id", "resource", "action"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get role by ID
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findOne({
      where: {
        role_id: id,
        is_active: true,
      },
      include: [
        {
          model: RolePermission,
          as: "rolePermissions",
          required: false,
          include: [
            {
              model: Permission,
              as: "permission",
              attributes: ["permission_id", "resource", "action"],
            },
          ],
        },
      ],
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error("Error fetching role:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateRole = async (req, res) => {
  const t = await Role.sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, description, permission_ids } = req.body;

    // Find the role
    const role = await Role.findOne({
      where: { role_id: id, is_active: true },
      transaction: t,
    });

    if (!role) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Check for duplicate name
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({
        where: { name },
        transaction: t,
      });

      if (existingRole) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Role name already exists",
        });
      }
    }

    await role.update(
      {
        name: name || role.name,
        description: description || role.description,
        updated_at: new Date(),
      },
      { transaction: t }
    );

    // CASE 2: If NO sub_roles, allow assigning direct permissions
    // ==========================================================
    if (Array.isArray(permission_ids) && permission_ids.length > 0) {
      // Soft delete old direct role permissions
      await RolePermission.update(
        { is_active: false, updated_at: new Date() },
        { where: { role_id: id }, transaction: t }
      );

      // Validate permissions
      const validPerms = await Permission.findAll({
        where: { permission_id: permission_ids },
        transaction: t,
      });

      if (validPerms.length !== permission_ids.length) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Some permissions are invalid",
        });
      }

      // Assign new permissions directly to the role
      const rolePerms = permission_ids.map((pid) => ({
        role_permission_id: uuidv4(),
        role_id: id,
        permission_id: pid,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await RolePermission.bulkCreate(rolePerms, { transaction: t });
    }

    await t.commit();

    //  Fetch updated role details
    const updatedRole = await Role.findOne({
      where: { role_id: id },
      include: [
        {
          model: RolePermission,
          as: "rolePermissions",
          where: { is_active: true },
          required: false,
          include: [{ model: Permission, as: "permission" }],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: updatedRole,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error updating role:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating role",
      error: error.message,
    });
  }
};

// Delete Role (Soft Delete)
const deleteRole = async (req, res) => {
  const t = await Role.sequelize.transaction();
  try {
    const { id } = req.params;

    // Find the role
    const role = await Role.findOne({
      where: {
        role_id: id,
        is_active: true,
      },
      transaction: t,
    });

    if (!role) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Check if role is being used in project user roles
    const roleInUse = await UserRole.findOne({
      where: {
        role_id: id,
        is_active: true,
      },
      transaction: t,
    });

    if (roleInUse) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete role. It is currently assigned to users.",
      });
    }

    // Soft delete the role
    await role.update(
      {
        is_active: false,
        deleted_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error deleting role:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting role",
      error: error.message,
    });
  }
};

module.exports = {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
};
