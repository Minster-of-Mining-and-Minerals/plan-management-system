const jwt = require("jsonwebtoken");
const db = require("../models");
const { sendPermissionDenied, toPermissionKey } = require("../utils/permissionDeniedUtils");
const { loadUserAccessGraphs } = require("../utils/userAccessGraphLoader");
const { validateSession } = require("../services/sessionSecurityService");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Only a genuinely invalid/expired JWT is an auth failure (client logs out).
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  try {
    // Fetch user with domain associations; roles/permissions come from the flat cached loader.
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
          model: db.Company,
          as: "company",
        },
        {
          model: db.CompanyStructure,
          as: "companyStructure",
        },
        {
          model: db.PurchasingCenter,
          as: "purchasingCenter",
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

    // Strict account isolation: reject access if company user's assigned company is inactive or missing
    if (user.company_id) {
      if (!user.company || !user.company.is_active) {
        return res.status(403).json({
          success: false,
          message: "Assigned company is inactive or deleted. Access denied.",
        });
      }
    }

    // Validate active session
    let activeSession = null;
    if (decoded.session_id) {
      try {
        activeSession = await validateSession({
          sessionId: decoded.session_id,
          userId: decoded.user_id,
          req,
        });
      } catch (sessionErr) {
        if (sessionErr.code === "SESSION_TERMINATED" || sessionErr.code === "SESSION_EXPIRED") {
          return res.status(401).json({
            success: false,
            code: sessionErr.code,
            message: sessionErr.message,
          });
        }
        if (sessionErr.code === "DEVICE_RESTRICTED" || sessionErr.code === "IP_RESTRICTED") {
          return res.status(403).json({
            success: false,
            code: sessionErr.code,
            message: sessionErr.message,
          });
        }
        throw sessionErr;
      }
    }

    const accessGraph = (await loadUserAccessGraphs([user.user_id])).get(user.user_id);
    const roles = (accessGraph?.roles || []).map((r) => r.name);
    const permissions = [...(accessGraph?.permissions || [])];

    const isRegional = !!user.region_id;
    const isCompany = !!user.company_id;
    const isPurchasingCenter = !!user.purchasing_center_id;
    const isFederal = !isRegional && !isCompany && !isPurchasingCenter;
    const domain = isRegional
      ? "regional"
      : isPurchasingCenter
      ? "purchasing_center"
      : isCompany
      ? "company"
      : "federal";

    req.sessionId = decoded.session_id || null;
    req.session = activeSession;
    req.user = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      domain,
      is_regional: isRegional,
      is_company: isCompany,
      is_purchasing_center: isPurchasingCenter,
      is_federal: isFederal,
      government_structure_id: user.government_structure_id,
      internal_structure_id: user.internal_structure_id,
      region_id: user.region_id,
      regional_structure_id: user.regional_structure_id,
      company_id: user.company_id,
      company_structure_id: user.company_structure_id,
      purchasing_center_id: user.purchasing_center_id,
      roles,
      permissions,
    };

    next();
  } catch (error) {
    // Database/load failures are not auth failures: report "temporarily unavailable" so the
    // client retries instead of logging the user out.
    console.error("Auth middleware error:", error);
    return res.status(503).json({
      success: false,
      code: "AUTH_BACKEND_UNAVAILABLE",
      message: "Service temporarily unavailable. Please retry.",
    });
  }
};

// Permission middleware
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Access denied: User not authenticated",
      });
    }

    // Super Admin role possesses all permissions
    if (
      Array.isArray(req.user.roles) &&
      req.user.roles.some((r) => String(r).toLowerCase() === "super admin")
    ) {
      return next();
    }

    if (!req.user.permissions) {
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
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Access denied: User not authenticated",
      });
    }

    // Super Admin role possesses all permissions
    if (
      Array.isArray(req.user.roles) &&
      req.user.roles.some((r) => String(r).toLowerCase() === "super admin")
    ) {
      return next();
    }

    if (!req.user.permissions) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permissions found",
      });
    }

    const hasAny = checks.some(({ resource, action }) => {
      const resLower = resource.toLowerCase();
      const actLower = action.toLowerCase();
      return (
        req.user.permissions.includes(`${resLower}:${actLower}`) ||
        req.user.permissions.includes(`${resLower}:manage`)
      );
    });

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
