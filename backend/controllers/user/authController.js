const db = require("../../models");
const { User, Role, RolePermission, Permission, PermissionGroup, GovernmentStructure, InternalStructure, Region, RegionalStructure } = db;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { normalizeEmail } = require("../../utils/emailUtils");
const { collectUserPermissionKeysUpper } = require("../../utils/userPermissionsUtils");
const { loadDepartmentPermissionGroups } = require("../../utils/specialPermissionGroupUtils");
const { Op } = require("sequelize");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const user = await User.unscoped().findOne({
      where: {
        email: { [Op.iLike]: normalizedEmail },
      },
      include: [
        { model: GovernmentStructure, as: "governmentStructure" },
        { model: InternalStructure, as: "internalStructure" },
        { model: Region, as: "region" },
        { model: RegionalStructure, as: "regionalStructure" },
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

    // Regional account domain check: if user belongs to a region, region must be active
    if (user.region_id) {
      if (!user.region || !user.region.is_active) {
        return res.status(403).json({
          success: false,
          message: "Assigned region is inactive or deleted. Access denied.",
        });
      }
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
          domain: user.region_id ? "regional" : "federal",
          region_id: user.region_id || null,
          regional_structure_id: user.regional_structure_id || null,
          region: user.region || null,
          regional_structure: user.regionalStructure || null,
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
    const user = await User.unscoped().findOne({
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
        "region_id",
        "regional_structure_id",
      ],
      include: [
        { model: GovernmentStructure, as: "governmentStructure" },
        { model: InternalStructure, as: "internalStructure" },
        { model: Region, as: "region" },
        { model: RegionalStructure, as: "regionalStructure" },
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
          domain: user.region_id ? "regional" : "federal",
          region_id: user.region_id || null,
          regional_structure_id: user.regional_structure_id || null,
          region: user.region || null,
          regional_structure: user.regionalStructure || null,
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
    const user = await User.unscoped().findOne({
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

    user.departmentPermissionGroups = await loadDepartmentPermissionGroups(
      user.internal_structure_id
    );

    const permissionsSet = new Set(collectUserPermissionKeysUpper(user));

    const isSuperAdmin = user.roles?.some(
      (r) => String(r.name).toLowerCase() === "super admin"
    );

    let allPermissionKeys = Array.from(permissionsSet);
    if (isSuperAdmin) {
      const allSystemPerms = await Permission.findAll({
        attributes: ["resource", "action"],
      });
      const fullSet = new Set(allPermissionKeys);
      for (const p of allSystemPerms) {
        if (p.resource && p.action) {
          fullSet.add(
            `${String(p.resource).trim()}:${String(p.action).trim()}`.toUpperCase()
          );
        }
      }
      allPermissionKeys = Array.from(fullSet);
    }

    return res.status(200).json({
      success: true,
      data: {
        permissions: allPermissionKeys,
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
