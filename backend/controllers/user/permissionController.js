const { Permission } = require("../../models");

// ====== Get all permissions ======
const getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      order: [["resource", "ASC"]],
      // order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      message: "Permissions fetched successfully.",
      data: permissions,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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
  activatePermission,
  deactivatePermission,
  togglePermission,
};
