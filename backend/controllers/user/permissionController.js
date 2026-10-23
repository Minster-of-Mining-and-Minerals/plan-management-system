const { Permission } = require("../../models");
const { Op } = require("sequelize");
const { getStructureAssignablePermissions } = require("../../utils/structureEffectivePermissionsUtils");
const { normalizePermissionTier, PERMISSION_TIER, filterPermissionsByTier } = require("../../utils/specialPermissionGroupUtils");
const {
  isSuperAdminActor,
  resolveManageableStructureId,
  sendScopeError,
} = require("../../utils/structureScopeUtils");

const getPermissions = async (req, res) => {
  try {
    const { government_structure_id: queryStructureId, scope, tier, is_active } = req.query;

    const normalizedTier = tier ? normalizePermissionTier(tier) : null;
    const wantsSpecialTier = normalizedTier === PERMISSION_TIER.SPECIAL;

    // Strict regional separation: return only regional permissions when scope=regional or caller is regional
    if (scope === "regional" || req.user?.is_regional) {
      const where = {
        [Op.or]: [
          { resource: { [Op.like]: "regional_%" } },
          { resource: "regions" },
        ],
      };
      if (is_active !== undefined) {
        where.is_active = is_active === "true";
      }
      if (tier) {
        where.permission_tier = normalizePermissionTier(tier);
      }

      const permissions = await Permission.findAll({
        where,
        order: [["resource", "ASC"], ["action", "ASC"]],
      });

      return res.status(200).json({
        success: true,
        message: "Regional permissions fetched successfully.",
        data: permissions,
      });
    }

    // Strict company separation: return only company permissions when scope=company or caller is company
    if (scope === "company" || req.user?.is_company) {
      const where = {
        [Op.or]: [
          { resource: { [Op.like]: "company_%" } },
          { resource: "companies" },
        ],
      };
      if (is_active !== undefined) {
        where.is_active = is_active === "true";
      }
      if (tier) {
        where.permission_tier = normalizePermissionTier(tier);
      }

      const permissions = await Permission.findAll({
        where,
        order: [["resource", "ASC"], ["action", "ASC"]],
      });

      return res.status(200).json({
        success: true,
        message: "Company permissions fetched successfully.",
        data: permissions,
      });
    }

    // Strict purchasing center separation: return only purchasing center permissions when scope=purchasing_center or caller is purchasing_center
    if (scope === "purchasing_center" || req.user?.is_purchasing_center) {
      const where = {
        [Op.or]: [
          { resource: { [Op.like]: "purchasing_center_%" } },
          { resource: "purchasing_centers" },
        ],
      };
      if (is_active !== undefined) {
        where.is_active = is_active === "true";
      }
      if (tier) {
        where.permission_tier = normalizePermissionTier(tier);
      }

      const permissions = await Permission.findAll({
        where,
        order: [["resource", "ASC"], ["action", "ASC"]],
      });

      return res.status(200).json({
        success: true,
        message: "Purchasing center permissions fetched successfully.",
        data: permissions,
      });
    }

    // System permissions separation: exclude regional, company, and purchasing center permissions when scope=system
    if (scope === "system") {
      const where = {
        [Op.and]: [
          { resource: { [Op.notLike]: "regional_%" } },
          { resource: { [Op.ne]: "regions" } },
          { resource: { [Op.notLike]: "company_%" } },
          { resource: { [Op.ne]: "companies" } },
          { resource: { [Op.notLike]: "purchasing_center_%" } },
          { resource: { [Op.ne]: "purchasing_centers" } },
        ],
      };
      if (is_active !== undefined) {
        where.is_active = is_active === "true";
      }
      if (tier) {
        where.permission_tier = normalizePermissionTier(tier);
      }

      const permissions = await Permission.findAll({
        where,
        order: [["resource", "ASC"], ["action", "ASC"]],
      });

      return res.status(200).json({
        success: true,
        message: "System permissions fetched successfully.",
        data: permissions,
      });
    }

    // Special governance permissions are global catalog entries. Structure-scoped
    // pickers hide them when the structure has not inherited every special permission.
    if (wantsSpecialTier && isSuperAdminActor(req)) {
      const permissions = await Permission.findAll({
        where: { is_active: true, permission_tier: PERMISSION_TIER.SPECIAL },
        order: [["resource", "ASC"], ["action", "ASC"]],
      });

      return res.status(200).json({
        success: true,
        message: "Special permissions fetched successfully.",
        data: permissions,
      });
    }

    let structureId;
    try {
      structureId = resolveManageableStructureId(req, queryStructureId);
    } catch (error) {
      return sendScopeError(res, error);
    }

    const listFullCatalog =
      isSuperAdminActor(req) && (!structureId || scope === "all");

    if (listFullCatalog) {
      const where = { is_active: true };
      if (tier) {
        where.permission_tier = normalizePermissionTier(tier);
      }

      const permissions = await Permission.findAll({
        where,
        order: [["resource", "ASC"], ["action", "ASC"]],
      });

      return res.status(200).json({
        success: true,
        message: "Permissions fetched successfully.",
        data: permissions,
      });
    }

    if (!structureId) {
      return res.status(400).json({
        success: false,
        message: "government_structure_id is required to list structure permissions.",
      });
    }

    const permissions = await getStructureAssignablePermissions(structureId);
    const effectiveTier = tier ? normalizePermissionTier(tier) : PERMISSION_TIER.STANDARD;
    const filteredPermissions = filterPermissionsByTier(permissions, effectiveTier);

    return res.status(200).json({
      success: true,
      message: "Structure assignable permissions fetched successfully.",
      data: filteredPermissions,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStructureEffectivePermissionsHandler = async (req, res) => {
  try {
    const { id: structureId } = req.params;

    try {
      resolveManageableStructureId(req, structureId);
    } catch (error) {
      return sendScopeError(res, error);
    }

    const permissions = await getStructureAssignablePermissions(structureId);

    return res.status(200).json({
      success: true,
      message: "Structure assignable permissions fetched successfully.",
      data: permissions,
    });
  } catch (error) {
    console.error("Error fetching structure effective permissions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function canManagePermissionRecord(req, permission) {
  if (isSuperAdminActor(req)) return true;
  const isRegional =
    permission.resource.startsWith("regional_") || permission.resource === "regions";
  if (isRegional) {
    const userPerms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
    return (
      userPerms.includes("regional_permissions:update") ||
      userPerms.includes("regional_permissions:manage") ||
      userPerms.includes("regional_users:manage") ||
      userPerms.includes("regions:manage")
    );
  }
  const isPurchasingCenter =
    permission.resource.startsWith("purchasing_center_") || permission.resource === "purchasing_centers";
  if (isPurchasingCenter) {
    const userPerms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
    return (
      userPerms.includes("purchasing_center_permissions:update") ||
      userPerms.includes("purchasing_center_permissions:manage") ||
      userPerms.includes("purchasing_center_users:manage") ||
      userPerms.includes("purchasing_centers:manage")
    );
  }
  const isCompany =
    permission.resource.startsWith("company_") || permission.resource === "companies";
  if (isCompany) {
    const userPerms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
    return (
      userPerms.includes("company_permissions:update") ||
      userPerms.includes("company_permissions:manage") ||
      userPerms.includes("company_users:manage") ||
      userPerms.includes("companies:manage")
    );
  }
  return false;
}

// ====== Activate permission ======
const activatePermission = async (req, res) => {
  try {
    const { permission_id } = req.params;

    const permission = await Permission.findByPk(permission_id);
    if (!permission) {
      return res
        .status(404)
        .json({ success: false, message: "Permission not found." });
    }

    if (!canManagePermissionRecord(req, permission)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permission to manage this permission.",
      });
    }

    permission.is_active = true;
    await permission.save();

    res.status(200).json({
      success: true,
      message: "Permission activated successfully.",
      data: permission,
    });
  } catch (error) {
    console.error("Error activating permission:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ====== Deactivate permission ======
const deactivatePermission = async (req, res) => {
  try {
    const { permission_id } = req.params;

    const permission = await Permission.findByPk(permission_id);
    if (!permission) {
      return res
        .status(404)
        .json({ success: false, message: "Permission not found." });
    }

    if (!canManagePermissionRecord(req, permission)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permission to manage this permission.",
      });
    }

    permission.is_active = false;
    await permission.save();

    res.status(200).json({
      success: true,
      message: "Permission deactivated successfully.",
      data: permission,
    });
  } catch (error) {
    console.error("Error deactivating permission:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ====== Toggle permission ======
const togglePermission = async (req, res) => {
  try {
    const { permission_id } = req.params;

    const permission = await Permission.findByPk(permission_id);
    if (!permission) {
      return res
        .status(404)
        .json({ success: false, message: "Permission not found." });
    }

    if (!canManagePermissionRecord(req, permission)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permission to manage this permission.",
      });
    }

    permission.is_active = !permission.is_active;
    await permission.save();

    res.status(200).json({
      success: true,
      message: `Permission ${
        permission.is_active ? "activated" : "deactivated"
      } successfully.`,
      data: permission,
    });
  } catch (error) {
    console.error("Error toggling permission:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPermissions,
  getStructureEffectivePermissionsHandler,
  activatePermission,
  deactivatePermission,
  togglePermission,
};
