const db = require("../../models");
const { User, Role, RolePermission, Permission, PermissionGroup } = db;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { logAudit, auditContextFromReq } = require("../../services/auditService");
const { sendError } = require("../../utils/httpError");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
    const userAgent = req.get("user-agent") || null;

    // Case-insensitive exact match (avoids LIKE wildcards on chars like _).
    const user = await User.findOne({
      where: db.sequelize.where(
        db.sequelize.fn("LOWER", db.sequelize.col("email")),
        normalizedEmail
      ),
    });

    if (!user) {
      await logAudit({
        actorUserId: null,
        action: "login_failed",
        resourceType: "auth",
        details: { email: normalizedEmail, reason: "user_not_found", userAgent },
        ipAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    if (!user.is_active) {
      await logAudit({
        actorUserId: user.user_id,
        action: "login_failed",
        resourceType: "auth",
        resourceId: user.user_id,
        details: { email: normalizedEmail, reason: "inactive", userAgent },
        ipAddress,
      });
      return res.status(403).json({
        success: false,
        message: "User is inactive",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAudit({
        actorUserId: user.user_id,
        action: "login_failed",
        resourceType: "auth",
        resourceId: user.user_id,
        details: { email: normalizedEmail, reason: "bad_password", userAgent },
        ipAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const account_type = user.account_type || "INTERNAL";
    const home_route =
      account_type === "PATIENT"
        ? "/patient/profile"
        : account_type === "PHARMACY"
          ? "/pharmacy/dashboard"
          : "/profile";

    const tokenVersion = Number(user.token_version || 0);

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        is_first_logged_in: user.is_first_logged_in,
        account_type,
        token_version: tokenVersion,
      },
      process.env.JWT_SECRET,
      {
        expiresIn:
          process.env.JWT_EXPIRES_IN ||
          process.env.JWT_EXPIRATION_TIME ||
          "12h",
      }
    );

    await User.update(
      { last_login_at: new Date() },
      { where: { user_id: user.user_id } }
    );

    await logAudit({
      actorUserId: user.user_id,
      action: "login_success",
      resourceType: "auth",
      resourceId: user.user_id,
      details: { email: user.email, account_type, userAgent },
      ipAddress,
    });

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
    return sendError(res, error, req);
  }
};

const logout = async (req, res) => {
  try {
    if (req.user?.user_id) {
      const ctx = auditContextFromReq(req);
      await logAudit({
        actorUserId: req.user.user_id,
        action: "logout",
        resourceType: "auth",
        resourceId: req.user.user_id,
        details: ctx.details,
        ipAddress: ctx.ipAddress,
      });
      // Optional soft revoke for this session family
      await User.increment("token_version", {
        where: { user_id: req.user.user_id },
      });
    }
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    return sendError(res, error, req);
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
    return sendError(res, error, req);
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
              where: { is_active: true },
              required: false,
              include: [
                {
                  model: Permission,
                  as: "permission",
                  attributes: ["resource", "action"],
                  where: { is_active: true },
                  required: false,
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
        if (rp.is_active === false || !rp.permission) return;
        if (rp.permission.is_active === false) return;
        permissionsSet.add(
          `${rp.permission.resource}:${rp.permission.action}`.toUpperCase()
        );
      });
    });

    user.permissionGroups?.forEach((group) => {
      if (group.is_active === false) return;
      group.permissions?.forEach((perm) => {
        if (perm.is_active === false) return;
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
    return sendError(res, error, req);
  }
};

module.exports = { login, logout, getMe, getMyPermissions };
