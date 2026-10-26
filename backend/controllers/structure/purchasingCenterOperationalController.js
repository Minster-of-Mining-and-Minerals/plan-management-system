"use strict";

const { Op } = require("sequelize");
const { PurchasingCenter, User, Role, RolePermission, Permission } = require("../../models");
const purchasingCenterBrandingService = require("../../services/purchasingCenterBrandingService");
const {
  assertPurchasingCenterAccessible,
  ROLE_SCOPE,
} = require("../../utils/structureScopeUtils");
const { STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS } = require("../../constants/systemRoles");

/**
 * GET /api/purchasing-center/dashboard
 * Purchasing center dashboard summary: identity, branding, user counts.
 * Note: Purchasing centers have no departments or organizational hierarchies.
 */
async function getPurchasingCenterDashboard(req, res) {
  try {
    let pcId = req.query.purchasing_center_id;

    if (req.user?.is_purchasing_center) {
      if (req.query.purchasing_center_id && req.query.purchasing_center_id !== req.user.purchasing_center_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot access a different purchasing center's dashboard.",
        });
      }
      pcId = req.user.purchasing_center_id;
    }

    if (!pcId) {
      return res.status(400).json({
        success: false,
        message: "purchasing_center_id is required.",
      });
    }

    assertPurchasingCenterAccessible(req, pcId, "read");

    const pc = await PurchasingCenter.findByPk(pcId, {
      attributes: ["purchasing_center_id", "name", "code", "description", "logo_path", "is_active", "created_at"],
    });

    if (!pc) {
      return res.status(404).json({
        success: false,
        message: "Purchasing center not found.",
      });
    }

    if (!pc.is_active) {
      return res.status(403).json({
        success: false,
        message: "Assigned purchasing center is inactive. Access denied.",
      });
    }

    const branding = await purchasingCenterBrandingService.resolveEffectiveBranding(pcId);

    const [
      totalUsers,
      activeUsers,
      recentUsers,
    ] = await Promise.all([
      User.count({ where: { purchasing_center_id: pcId } }),
      User.count({ where: { purchasing_center_id: pcId, is_active: true } }),
      User.findAll({
        where: { purchasing_center_id: pcId },
        order: [["created_at", "DESC"]],
        limit: 5,
        attributes: ["user_id", "full_name", "email", "phone_number", "is_active", "created_at"],
        include: [
          {
            model: Role,
            as: "roles",
            attributes: ["role_id", "name", "scope"],
            through: { attributes: [] },
          },
        ],
      }),
    ]);

    const formattedRecentUsers = (recentUsers || []).map((u) => {
      return u.toJSON ? u.toJSON() : u;
    });

    return res.status(200).json({
      success: true,
      data: {
        purchasing_center: pc.toJSON ? pc.toJSON() : pc,
        branding,
        counts: {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers,
          },
        },
        recent_users: formattedRecentUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching purchasing center dashboard data:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to load purchasing center dashboard summary.",
    });
  }
}

/**
 * GET /api/purchasing-center/roles
 * Retrieve roles assignable to purchasing center users (scope: purchasing_center or assignable global).
 */
async function getPurchasingCenterRoles(req, res) {
  try {
    const roles = await Role.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { scope: "purchasing_center" },
          { role_id: Array.from(STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS || []) },
        ],
      },
      order: [["name", "ASC"]],
      include: [
        {
          model: RolePermission,
          as: "rolePermissions",
          required: false,
          where: { is_active: true },
          include: [
            {
              model: Permission,
              as: "permission",
              attributes: ["permission_id", "resource", "action"],
            },
          ],
        },
      ],
    });

    const formattedRoles = roles.map((r) => {
      const plain = r.toJSON ? r.toJSON() : r;
      const permissions = (plain.rolePermissions || [])
        .map((rp) => rp.permission)
        .filter(Boolean);
      return {
        ...plain,
        permissions,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedRoles,
    });
  } catch (error) {
    console.error("Error fetching purchasing center roles:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to load purchasing center roles.",
    });
  }
}

module.exports = {
  getPurchasingCenterDashboard,
  getPurchasingCenterRoles,
};
