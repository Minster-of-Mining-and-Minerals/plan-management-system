const db = require("../../models");
const { User, Role, RolePermission, Permission, PermissionGroup } = db;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
    });

    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });
    if (!user.is_active)
      return res.status(403).json({ message: "User is inactive" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });

    const account_type = user.account_type || "INTERNAL";
    const home_route =
      account_type === "PATIENT"
        ? "/patient/profile"
        : account_type === "PHARMACY"
          ? "/pharmacy/dashboard"
          : "/profile";

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        is_first_logged_in: user.is_first_logged_in,
        account_type,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

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
          account_type,
          home_route,
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

const logout = async (req, res) => {
  try {
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

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
        "account_type",
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const account_type = user.account_type || "INTERNAL";
    const home_route =
      account_type === "PATIENT"
        ? "/patient/profile"
        : account_type === "PHARMACY"
          ? "/pharmacy/dashboard"
          : "/profile";

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
          account_type,
          home_route,
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

const getMyPermissions = async (req, res) => {
  try {
    if (req.user?.account_type === "PATIENT" || req.user?.account_type === "PHARMACY") {
      return res.status(200).json({
        success: true,
        data: { permissions: [], roles: [] },
      });
    }

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

    user.roles?.forEach((role) => {
      role.rolePermissions?.forEach((rp) => {
        if (rp.permission) {
          permissionsSet.add(
            `${rp.permission.resource}:${rp.permission.action}`.toUpperCase()
          );
        }
      });
    });

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
