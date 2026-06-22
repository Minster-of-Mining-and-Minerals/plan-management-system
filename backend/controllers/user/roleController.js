// controllers/roleController.js
const { Role, Permission, RolePermission, UserRoles } = require("../../models");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const { ROLE_SCOPE } = require("../../constants/systemRoles");
const { assertPermissionIdsAllowedForStructure } = require("../../utils/structureEffectivePermissionsUtils");
const {
  isSuperAdminActor,
  resolveManageableStructureId,
  buildRoleVisibilityWhere,
  assertRoleAccessible,
  assertRoleAssignable,
  assertRoleModifiable,
  assertRoleDeletable,
  sendScopeError,
} = require("../../utils/structureScopeUtils");

async function assertValidPermissionIds(permissionIds, transaction) {
  if (!permissionIds?.length) return;

  const uniqueIds = [...new Set(permissionIds)];
  const found = await Permission.findAll({
    where: { permission_id: uniqueIds, is_active: true },
    transaction,
  });

  if (found.length !== uniqueIds.length) {
    const error = new Error("One or more permissions are invalid or inactive.");
    error.status = 400;
    throw error;
  }
}

function parsePermissionIds(permission_ids) {
  if (!permission_ids) return [];
  let permissionIds = permission_ids;
  if (typeof permissionIds === "string") {
    try {
      permissionIds = JSON.parse(permissionIds);
    } catch {
      permissionIds = permissionIds.split(",").map((i) => i.trim());
    }
  }
  return Array.isArray(permissionIds) ? permissionIds : [];
}

async function assertUniqueRoleName(name, government_structure_id, scope, transaction, excludeRoleId) {
  const where = {
    name,
    scope,
    deleted_at: null,
    ...(excludeRoleId ? { role_id: { [Op.ne]: excludeRoleId } } : {}),
  };

  if (scope === ROLE_SCOPE.STRUCTURE) {
    where.government_structure_id = government_structure_id;
  } else {
    where.government_structure_id = null;
  }

  const existing = await Role.findOne({ where, transaction });
  if (existing) {
    const error = new Error("Role name already exists for this scope.");
    error.status = 400;
    throw error;
  }
}

const createRole = async (req, res) => {
  const t = await Role.sequelize.transaction();
  try {
    const { name, description, permission_ids, government_structure_id: bodyStructureId } =
      req.body;
    const permissionIds = parsePermissionIds(permission_ids);

    let structureId;
    try {
      structureId = resolveManageableStructureId(req, bodyStructureId);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    if (!structureId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "government_structure_id is required to create a structure role.",
      });
    }

    await assertUniqueRoleName(name, structureId, ROLE_SCOPE.STRUCTURE, t);
    await assertPermissionIdsAllowedForStructure(permissionIds, structureId, {
      transaction: t,
    });

    const role = await Role.create(
      {
        role_id: uuidv4(),
        name,
        description,
        scope: ROLE_SCOPE.STRUCTURE,
        government_structure_id: structureId,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    if (permissionIds.length > 0) {
      const rolePermissions = permissionIds.map((pid) => ({
        role_permission_id: uuidv4(),
        role_id: role.role_id,
        permission_id: pid,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      await RolePermission.bulkCreate(rolePermissions, { transaction: t });
    }

    await t.commit();

    const createdRole = await Role.findOne({
      where: { role_id: role.role_id },
      include: [
        {
          model: RolePermission,
          as: "rolePermissions",
          required: false,
          where: { is_active: true },
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
      message: "Role created successfully",
      data: createdRole,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    if (error.status) {
      return sendScopeError(res, error);
    }
    console.error("Error creating role:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating role",
      error: error.message,
    });
  }
};

const getRoles = async (req, res) => {
  try {
    const { is_active, government_structure_id: queryStructureId } = req.query;
    const whereClause = {};

    if (is_active !== undefined) {
      whereClause.is_active = is_active === "true";
    }

    let structureId;
    try {
      structureId = resolveManageableStructureId(req, queryStructureId);
    } catch (error) {
      return sendScopeError(res, error);
    }

    try {
      Object.assign(whereClause, buildRoleVisibilityWhere(req, structureId));
    } catch (error) {
      return sendScopeError(res, error);
    }

    const roles = await Role.findAll({
      where: whereClause,
      include: [
        {
          model: RolePermission,
          as: "rolePermissions",
          required: false,
          where: { is_active: true },
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

const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const { government_structure_id: queryStructureId } = req.query;

    let structureId;
    try {
      structureId = resolveManageableStructureId(req, queryStructureId);
    } catch (error) {
      return sendScopeError(res, error);
    }

    const role = await Role.findOne({
      where: { role_id: id, is_active: true },
      include: [
        {
          model: RolePermission,
          as: "rolePermissions",
          required: false,
          where: { is_active: true },
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

    try {
      assertRoleAccessible(role, req, structureId || role.government_structure_id);
    } catch (error) {
      return sendScopeError(res, error);
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
    const { name, description, permission_ids, government_structure_id: queryStructureId } =
      req.body;

    let structureId;
    try {
      structureId = resolveManageableStructureId(req, queryStructureId);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

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

    try {
      assertRoleAccessible(role, req, structureId || role.government_structure_id);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    try {
      assertRoleModifiable(role, req);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    if (name && name !== role.name) {
      await assertUniqueRoleName(
        name,
        role.government_structure_id,
        role.scope,
        t,
        id
      );
    }

    await role.update(
      {
        name: name || role.name,
        description: description ?? role.description,
        updated_at: new Date(),
      },
      { transaction: t }
    );

    if (Array.isArray(permission_ids)) {
      const permissionIds = parsePermissionIds(permission_ids);

      if (role.scope === ROLE_SCOPE.STRUCTURE) {
        await assertPermissionIdsAllowedForStructure(
          permissionIds,
          role.government_structure_id,
          { transaction: t }
        );
      } else {
        await assertValidPermissionIds(permissionIds, t);
      }

      await RolePermission.update(
        { is_active: false, updated_at: new Date() },
        { where: { role_id: id }, transaction: t }
      );

      if (permissionIds.length > 0) {
        const rolePerms = permissionIds.map((pid) => ({
          role_permission_id: uuidv4(),
          role_id: id,
          permission_id: pid,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }));
        await RolePermission.bulkCreate(rolePerms, { transaction: t });
      }
    }

    await t.commit();

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
    if (error.status) {
      return sendScopeError(res, error);
    }
    console.error("Error updating role:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating role",
      error: error.message,
    });
  }
};

const deleteRole = async (req, res) => {
  const t = await Role.sequelize.transaction();
  try {
    const { id } = req.params;
    const { government_structure_id: queryStructureId } = req.query;

    let structureId;
    try {
      structureId = resolveManageableStructureId(req, queryStructureId);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

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

    try {
      assertRoleAccessible(role, req, structureId || role.government_structure_id);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    try {
      assertRoleDeletable(role, req);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    const roleInUse = await UserRoles.findOne({
      where: { role_id: id, is_active: true },
      transaction: t,
    });

    if (roleInUse) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete role. It is currently assigned to users.",
      });
    }

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
