const jwt = require("jsonwebtoken");
const db = require("../models");
const { sendPermissionDenied, toPermissionKey } = require("../utils/permissionDeniedUtils");
const { collectUserPermissionKeys } = require("../utils/userPermissionsUtils");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user with roles, role permissions, and permission groups
    const user = await db.User.findByPk(decoded.user_id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: db.Role,
          as: "roles",
          through: { attributes: [] },
          include: [
            {
              model: db.RolePermission,
              as: "rolePermissions",
              include: [
                {
                  model: db.Permission,
                  as: "permission",
                  attributes: ["resource", "action"],
                },
              ],
            },
          ],
        },
        {
          model: db.PermissionGroup,
          as: "permissionGroups",
          through: { attributes: [] },
          include: [
            {
              model: db.Permission,
              as: "permissions",
              attributes: ["resource", "action"],
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!user || !user.is_active) {
      return res.status(403).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    const roles = user.roles.map((r) => r.name);
    const permissions = collectUserPermissionKeys(user);

    req.user = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      government_structure_id: user.government_structure_id,
      internal_structure_id: user.internal_structure_id,
      roles,
      permissions,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Permission middleware
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    const requiredPermission = `${resource.toLowerCase()}:${action.toLowerCase()}`;

    if (!req.user || !req.user.permissions) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permissions found",
      });
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      return sendPermissionDenied(res, {
        message: "Access denied",
        permissions: [requiredPermission],
        mode: "all",
      });
    }

    next();
  };
};

/** Pass if the user has at least one of the given resource/action pairs. */
const checkAnyPermission = (checks) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permissions found",
      });
    }

    const hasAny = checks.some(({ resource, action }) =>
      req.user.permissions.includes(`${resource.toLowerCase()}:${action.toLowerCase()}`)
    );

    if (!hasAny) {
      const required = checks.map(({ resource, action }) =>
        toPermissionKey(resource, action)
      );
      return sendPermissionDenied(res, {
        message: "Access denied",
        permissions: required,
        mode: "any",
      });
    }

    next();
  };
};

// Role checking middleware
const requireRole = (roleName) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No roles found",
      });
    }

    if (!req.user.roles.includes(roleName)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Required role ${roleName}`,
      });
    }

    next();
  };
};

// Check if user has any of the specified roles
const requireAnyRole = (roleNames) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No roles found",
      });
    }

    const hasRole = roleNames.some((roleName) =>
      req.user.roles.includes(roleName)
    );

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Required one of roles: ${roleNames.join(
          ", "
        )}`,
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  checkPermission,
  checkAnyPermission,
  requireRole,
  requireAnyRole,
};
