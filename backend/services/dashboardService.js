const { User } = require("../models");

const getDashboardStats = async () => {
  try {
    const totalUsers = await User.count({ where: { is_active: true } });

    return {
      success: true,
      message: "Dashboard statistics fetched successfully.",
      data: {
        summary: {
          total_users: totalUsers,
        },
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

const getDashboardSummary = async () => {
  try {
    const totalUsers = await User.count({ where: { is_active: true } });

    return {
      success: true,
      message: "Dashboard summary fetched successfully.",
      data: {
        summary: {
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
