const jwt = require("jsonwebtoken");
const db = require("../models");
const { sendPermissionDenied, toPermissionKey } = require("../utils/permissionDeniedUtils");
const {
  collectUserPermissionKeys,
} = require("../utils/userPermissionsUtils");
const { loadDepartmentPermissionGroups } = require("../utils/specialPermissionGroupUtils");

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

    // Fetch user with roles, role permissions, permission groups, and regional associations
    const user = await db.User.findByPk(decoded.user_id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: db.Region,
          as: "region",
        },
        {
          model: db.RegionalStructure,
          as: "regionalStructure",
        },
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

    // Strict account isolation: reject access if regional user's assigned region is inactive or missing
    if (user.region_id) {
      if (!user.region || !user.region.is_active) {
        return res.status(403).json({
          success: false,
          message: "Assigned region is inactive or deleted. Access denied.",
        });
      }
    }

    user.departmentPermissionGroups = await loadDepartmentPermissionGroups(
      user.internal_structure_id
    );

    const roles = user.roles.map((r) => r.name);
    const permissions = collectUserPermissionKeys(user);

    const isRegional = !!user.region_id;
    const isFederal = !isRegional;
    const domain = isRegional ? "regional" : "federal";

    req.user = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      domain,
      is_regional: isRegional,
      is_federal: isFederal,
      government_structure_id: user.government_structure_id,
      internal_structure_id: user.internal_structure_id,
      region_id: user.region_id,
      regional_structure_id: user.regional_structure_id,
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
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permissions found",
      });
    }

    const resourceLower = resource.toLowerCase();
    const actionLower = action.toLowerCase();
    const requiredPermission = `${resourceLower}:${actionLower}`;
    const managePermission = `${resourceLower}:manage`;

    if (
      !req.user.permissions.includes(requiredPermission) &&
      !req.user.permissions.includes(managePermission)
    ) {
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
