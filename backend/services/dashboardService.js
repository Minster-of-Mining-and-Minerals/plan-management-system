// services/dashboardService.js
const {
  Structure,
  User,
  Sequelize,
} = require("../models");

/**
 * getDashboardStats - Fetches overall statistics for the dashboard
 */
const getDashboardStats = async (structureId = null) => {
  try {
    let structureWhere = { is_active: true };

    if (structureId) {
      structureWhere.structure_id = structureId;
    } else {
      // For global dashboard, focus on root structures
      structureWhere.parent_id = null;
    }

    const structures = await Structure.findAll({
      where: structureWhere,
      attributes: [
        "structure_id",
        "name",
        "description",
        "created_at",
      ],
      order: [["name", "ASC"]],
    });

    // Count total users
    const totalUsers = await User.count({ where: { is_active: true } });
    const totalStructures = await Structure.count({ where: { is_active: true } });

    const transformedStructures = structures.map((structure) => {
      return {
        structure_id: structure.structure_id,
        name: structure.name,
        description: structure.description,
        created_at: structure.created_at,
      };
    });

    return {
      success: true,
      message: "Dashboard statistics fetched successfully.",
      data: {
        summary: {
          total_structures: totalStructures,
          total_users: totalUsers,
        },
        structures: transformedStructures,
      },
    };
  } catch (error) {
    console.error("Dashboard statistics error:", error);
    return {
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message,
    };
  }
};

/**
 * getDashboardSummary - Fetches a condensed summary of dashboard data
 */
const getDashboardSummary = async () => {
  try {
    const totalUsers = await User.count({ where: { is_active: true } });
    const totalStructures = await Structure.count({ where: { is_active: true } });

    return {
      success: true,
      message: "Dashboard summary fetched successfully.",
      data: {
        summary: {
          total_structures: totalStructures,
          total_users: totalUsers,
        },
      },
    };
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return {
      success: false,
      message: "Failed to fetch dashboard summary",
      error: error.message,
    };
  }
};

module.exports = {
  getDashboardStats,
  getDashboardSummary,
};
