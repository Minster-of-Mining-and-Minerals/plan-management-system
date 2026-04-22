// services/dashboardService.js
const {
  SectorNode,
  User,
  Sequelize,
} = require("../models");

/**
 * getDashboardStats - Fetches overall statistics for the dashboard
 */
const getDashboardStats = async (sectorNodeId = null) => {
  try {
    let sectorWhere = { is_active: true };

    if (sectorNodeId) {
      sectorWhere.sector_node_id = sectorNodeId;
    } else {
      // For global dashboard, we can focus on root sectors or all active sectors
      // Let's get root sectors for the sectors list
      const rootSectors = await SectorNode.findAll({
        where: {
          parent_id: null,
          is_active: true,
        },
        attributes: ["sector_node_id"],
      });

      const rootSectorIds = rootSectors.map((s) => s.sector_node_id);
      // If we want to show stats for root-level children
      sectorWhere.parent_id = rootSectorIds;
    }

    const sectors = await SectorNode.findAll({
      where: sectorWhere,
      attributes: [
        "sector_node_id",
        "name",
        "description",
        "created_at",
      ],
      order: [["name", "ASC"]],
    });

    // Count total users
    const totalUsers = await User.count({ where: { is_active: true } });
    const totalSectors = await SectorNode.count({ where: { is_active: true } });

    const transformedSectors = sectors.map((sector) => {
      // Mock data for Plan Categories and Plans until real models are implemented
      const mockCategories = [
        {
          category_id: "cat-1",
          name: "Annual Operational Plan",
          description: "Core ministerial operations",
          total_plans: 12,
          plans: [
            { id: "p1", status: "completed", created_at: "2024-01-15" },
            { id: "p2", status: "in_progress", created_at: "2024-02-20" },
            { id: "p3", status: "pending", created_at: "2024-03-05" },
          ]
        },
        {
          category_id: "cat-2",
          name: "Infrastructure Development",
          description: "Mining site infrastructure",
          total_plans: 8,
          plans: [
            { id: "p4", status: "rejected", created_at: "2024-01-10" },
            { id: "p5", status: "completed", created_at: "2024-02-15" },
          ]
        },
        {
          category_id: "cat-3",
          name: "Resource Exploration",
          description: "Geological survey plans",
          total_plans: 15,
          plans: [
            { id: "p6", status: "in_progress", created_at: "2024-03-20" },
          ]
        }
      ];

      return {
        sector_node_id: sector.sector_node_id,
        name: sector.name,
        description: sector.description,
        created_at: sector.created_at,
        total_plans: 35,
        completed_plans: 18,
        plan_categories: mockCategories, // Renamed from complaint_categories
      };
    });

    return {
      success: true,
      message: "Dashboard statistics fetched successfully.",
      data: {
        summary: {
          total_sectors: totalSectors,
          total_users: totalUsers,
          total_plans: totalSectors * 35,
        },
        sectors: transformedSectors,
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
    const totalSectors = await SectorNode.count({ where: { is_active: true } });

    return {
      success: true,
      message: "Dashboard summary fetched successfully.",
      data: {
        summary: {
          total_sectors: totalSectors,
          total_users: totalUsers,
          total_plans: 0,
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
