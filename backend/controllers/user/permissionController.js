const { Permission } = require("../../models");
const { getStructureAssignablePermissions } = require("../../utils/structureEffectivePermissionsUtils");
const {
  isSuperAdminActor,
  resolveManageableStructureId,
  sendScopeError,
} = require("../../utils/structureScopeUtils");

const getPermissions = async (req, res) => {
  try {
    const { government_structure_id: queryStructureId, scope } = req.query;

    let structureId;
    try {
      structureId = resolveManageableStructureId(req, queryStructureId);
    } catch (error) {
      return sendScopeError(res, error);
    }

    const listFullCatalog =
      isSuperAdminActor(req) && (!structureId || scope === "all");

    if (listFullCatalog) {
      const permissions = await Permission.findAll({
        where: { is_active: true },
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

    return res.status(200).json({
      success: true,
      message: "Structure assignable permissions fetched successfully.",
      data: permissions,
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

// ====== Activate permission ======
const activatePermission = async (req, res) => {
  try {
    if (!isSuperAdminActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can manage the global permission catalog.",
      });
    }

    const { permission_id } = req.params;

    const permission = await Permission.findByPk(permission_id);
    if (!permission) {
      return res
        .status(404)
        .json({ success: false, message: "Permission not found." });
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
    if (!isSuperAdminActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can manage the global permission catalog.",
      });
    }

    const { permission_id } = req.params;

    const permission = await Permission.findByPk(permission_id);
    if (!permission) {
      return res
        .status(404)
        .json({ success: false, message: "Permission not found." });
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
    if (!isSuperAdminActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can manage the global permission catalog.",
      });
    }

    const { permission_id } = req.params;

    const permission = await Permission.findByPk(permission_id);
    if (!permission) {
      return res
        .status(404)
        .json({ success: false, message: "Permission not found." });
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
