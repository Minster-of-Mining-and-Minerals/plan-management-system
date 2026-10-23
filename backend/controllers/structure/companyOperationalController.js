"use strict";

const { Op } = require("sequelize");
const { Company, CompanyStructure, User, Role, RolePermission, Permission } = require("../../models");
const companyBrandingService = require("../../services/companyBrandingService");
const {
  assertCompanyAccessible,
} = require("../../utils/structureScopeUtils");
const { STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS } = require("../../constants/systemRoles");

/**
 * GET /api/company/dashboard
 * Company dashboard summary: company identity, branding, department counts, user counts.
 * Note: Planning definitions, plan execution, and reporting widgets are strictly placeholders.
 */
async function getCompanyDashboard(req, res) {
  try {
    let companyId = req.query.company_id;

    if (req.user?.is_company) {
      if (req.query.company_id && req.query.company_id !== req.user.company_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot access a different company's dashboard.",
        });
      }
      companyId = req.user.company_id;
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "company_id is required.",
      });
    }

    assertCompanyAccessible(req, companyId, "read");

    const company = await Company.findByPk(companyId, {
      attributes: ["company_id", "name", "code", "description", "is_active", "created_at"],
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    if (!company.is_active) {
      return res.status(403).json({
        success: false,
        message: "Assigned company is inactive. Access denied.",
      });
    }

    const branding = await companyBrandingService.resolveEffectiveCompanyBranding(companyId);

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
      CompanyStructure.count({ where: { company_id: companyId } }),
      CompanyStructure.count({ where: { company_id: companyId, parent_id: null } }),
      CompanyStructure.count({ where: { company_id: companyId, is_active: true } }),
      User.count({ where: { company_id: companyId } }),
      User.count({ where: { company_id: companyId, is_active: true } }),
      User.count({ where: { company_id: companyId, company_structure_id: { [Op.ne]: null } } }),
      CompanyStructure.findAll({
        where: { company_id: companyId },
        order: [["created_at", "DESC"]],
        limit: 5,
        attributes: ["company_structure_id", "name", "level", "is_active", "created_at"],
      }),
      User.findAll({
        where: { company_id: companyId },
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
            model: CompanyStructure,
            as: "companyStructure",
            attributes: ["company_structure_id", "name"],
          },
        ],
      }),
    ]);

    const formattedRecentUsers = (recentUsers || []).map((u) => {
      const plain = u.toJSON ? u.toJSON() : u;
      return {
        ...plain,
        company_structure: plain.companyStructure,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        company: company.toJSON ? company.toJSON() : company,
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
        recent_users: formattedRecentUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching company dashboard data:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to load company dashboard summary.",
    });
  }
}

/**
 * GET /api/company/roles
 * Retrieve roles assignable to company users (scope: company or assignable global).
 */
async function getCompanyRoles(req, res) {
  try {
    const targetCompanyId = req.user?.is_company ? req.user.company_id : (req.query.company_id || null);

    const roles = await Role.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          {
            scope: "company",
            [Op.or]: [
              { company_id: null },
              ...(targetCompanyId ? [{ company_id: targetCompanyId }] : []),
            ],
          },
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
    console.error("Error fetching company roles:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch company roles.",
    });
  }
}

module.exports = {
  getCompanyDashboard,
  getCompanyRoles,
};
