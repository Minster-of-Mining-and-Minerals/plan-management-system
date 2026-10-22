"use strict";

const { Op } = require("sequelize");
const { Region, RegionalStructure, User, Role, RolePermission, Permission } = require("../../models");
const regionalBrandingService = require("../../services/regionalBrandingService");
const {
  assertRegionAccessible,
  ROLE_SCOPE,
} = require("../../utils/structureScopeUtils");
const { STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS } = require("../../constants/systemRoles");

/**
 * GET /api/regional/dashboard
 * Regional dashboard summary information: region identity, branding, department counts, user counts.
 * Note: Planning definitions, plan execution, and reporting widgets are strictly out of scope.
 */
async function getRegionalDashboard(req, res) {
  try {
    let regionId = req.query.region_id;

    if (req.user?.is_regional) {
      if (req.query.region_id && req.query.region_id !== req.user.region_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot access a different region's dashboard.",
        });
      }
      regionId = req.user.region_id;
    }

    if (!regionId) {
      return res.status(400).json({
        success: false,
        message: "region_id is required.",
      });
    }

    assertRegionAccessible(req, regionId, "read");

    const region = await Region.findByPk(regionId, {
      attributes: ["region_id", "name", "code", "description", "is_active", "created_at"],
    });

    if (!region) {
      return res.status(404).json({
        success: false,
        message: "Region not found.",
      });
    }

    if (!region.is_active) {
      return res.status(403).json({
        success: false,
        message: "Assigned region is inactive. Access denied.",
      });
    }

    const branding = await regionalBrandingService.resolveEffectiveRegionalBranding(regionId);

    const [
      totalDepts,
      rootDepts,
      activeDepts,
      totalUsers,
      activeUsers,
      assignedUsers,
      recentDepts,
      recentUsers,
    ] = await Promise.all([
      RegionalStructure.count({ where: { region_id: regionId } }),
      RegionalStructure.count({ where: { region_id: regionId, parent_id: null } }),
      RegionalStructure.count({ where: { region_id: regionId, is_active: true } }),
      User.count({ where: { region_id: regionId } }),
      User.count({ where: { region_id: regionId, is_active: true } }),
      User.count({ where: { region_id: regionId, regional_structure_id: { [Op.ne]: null } } }),
      RegionalStructure.findAll({
        where: { region_id: regionId },
        order: [["created_at", "DESC"]],
        limit: 5,
        attributes: ["regional_structure_id", "name", "level", "is_active", "created_at"],
      }),
      User.findAll({
        where: { region_id: regionId },
        order: [["created_at", "DESC"]],
        limit: 5,
        attributes: ["user_id", "full_name", "email", "is_active", "created_at"],
        include: [
          {
            model: Role,
            as: "roles",
            attributes: ["role_id", "name", "scope"],
            through: { attributes: [] },
          },
          {
            model: RegionalStructure,
            as: "regional_structure",
            attributes: ["regional_structure_id", "name"],
          },
        ],
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        region: region.toJSON ? region.toJSON() : region,
        branding,
        counts: {
          departments: {
            total: totalDepts,
            root: rootDepts,
            active: activeDepts,
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            assigned: assignedUsers,
            unassigned: totalUsers - assignedUsers,
          },
        },
        recent_departments: recentDepts,
        recent_users: recentUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching regional dashboard data:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to load regional dashboard summary.",
    });
  }
}

/**
 * GET /api/regional/roles
 * Retrieve roles assignable to regional users (scope: regional or assignable global).
 */
async function getRegionalRoles(req, res) {
  try {
    const roles = await Role.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { scope: "regional" },
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
    console.error("Error fetching regional roles:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch regional roles.",
    });
  }
}

module.exports = {
  getRegionalDashboard,
  getRegionalRoles,
};
