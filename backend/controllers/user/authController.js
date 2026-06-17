const db = require("../../models");
const { User, Role, RolePermission, Permission, PermissionGroup, GovernmentStructure, InternalStructure } = db;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { normalizeEmail } = require("../../utils/emailUtils");
const { Op } = require("sequelize");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
      where: {
        email: { [Op.iLike]: normalizedEmail },
      },
      include: [
        { model: GovernmentStructure, as: "governmentStructure" },
        { model: InternalStructure, as: "internalStructure" },
      ],
    });

    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "User is inactive",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });

    // ===== Generate JWT Token (lean - no roles/permissions to avoid cookie bloat) =====
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        is_first_logged_in: user.is_first_logged_in,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Update last login
    await User.update(
      { last_login_at: new Date() },
      { where: { user_id: user.user_id } }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          profile_image: user.profile_image,
          is_first_logged_in: user.is_first_logged_in,
          government_structure: user.governmentStructure ? user.governmentStructure : [],
          internal_structure: user.internalStructure ? user.internalStructure : [],
        },
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get current user profile (lean)
const getMe = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { user_id: req.user.user_id },
      attributes: [
        "user_id",
        "full_name",
        "email",
        "phone_number",
        "profile_image",
        "is_first_logged_in",
        "government_structure_id",
        "internal_structure_id",
      ],
      include: [
        { model: GovernmentStructure, as: "governmentStructure" },
        { model: InternalStructure, as: "internalStructure" },
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          profile_image: user.profile_image,
          is_first_logged_in: user.is_first_logged_in,
          government_structure: user.governmentStructure ? user.governmentStructure : [],
          internal_structure: user.internalStructure ? user.internalStructure : [],
        },
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get current user's roles and aggregated permissions
const getMyPermissions = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { user_id: req.user.user_id },
      include: [
        {
          model: Role,
          as: "roles",
          through: { attributes: [] },
          include: [
            {
              model: RolePermission,
              as: "rolePermissions",
              include: [
                {
                  model: Permission,
                  as: "permission",
                  attributes: ["resource", "action"],
                },
              ],
            },
          ],
        },
        {
          model: PermissionGroup,
          as: "permissionGroups",
          through: { attributes: [] },
          include: [
            {
              model: Permission,
              as: "permissions",
              attributes: ["resource", "action"],
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const permissionsSet = new Set();

    // 1. Collect permissions from Roles
    user.roles?.forEach((role) => {
      role.rolePermissions?.forEach((rp) => {
        if (rp.permission) {
          permissionsSet.add(
            `${rp.permission.resource}:${rp.permission.action}`.toUpperCase()
          );
        }
      });
    });

    // 2. Collect permissions from Permission Groups
    user.permissionGroups?.forEach((group) => {
      group.permissions?.forEach((perm) => {
        permissionsSet.add(`${perm.resource}:${perm.action}`.toUpperCase());
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        permissions: Array.from(permissionsSet),
        roles: user.roles?.map((r) => r.name) || [],
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports = { login, logout, getMe, getMyPermissions };
