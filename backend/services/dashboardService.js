"use strict";

const { Op } = require("sequelize");
const {
  User,
  Department,
  CashierPayment,
  CashierSession,
  StaffAppointment,
} = require("../models");
const { ACCOUNT_TYPES } = require("../config/accountTypes");

const getDashboardStats = async () => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [
      total_users,
      total_patients,
      active_departments,
      active_staff,
      appointments_today,
      payments_today_count,
      payments_today_amount,
      open_cashier_sessions,
    ] = await Promise.all([
      User.count({ where: { is_active: true } }),
      User.count({
        where: { account_type: ACCOUNT_TYPES.PATIENT, is_active: true },
      }),
      Department.count({ where: { status: "active" } }),
      User.count({
        where: { account_type: ACCOUNT_TYPES.INTERNAL, is_active: true },
      }),
      StaffAppointment.count({
        where: {
          admitted_at: { [Op.between]: [start, end] },
        },
      }),
      CashierPayment.count({
        where: {
          status: "completed",
          created_at: { [Op.between]: [start, end] },
        },
      }),
      CashierPayment.sum("amount", {
        where: {
          status: "completed",
          created_at: { [Op.between]: [start, end] },
        },
      }),
      CashierSession.count({ where: { status: "open" } }),
    ]);

    return {
      success: true,
      message: "Dashboard statistics fetched successfully.",
      data: {
        summary: {
          total_users,
          total_patients,
          active_departments,
          active_staff,
          appointments_today,
          payments_today_count,
          payments_today_amount: Number(payments_today_amount) || 0,
          open_cashier_sessions,
        },
        live_keys: [
          "total_patients",
          "active_departments",
          "active_staff",
          "appointments_today",
          "payments_today_count",
          "payments_today_amount",
          "open_cashier_sessions",
        ],
        generated_at: new Date().toISOString(),
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

const getDashboardSummary = async () => getDashboardStats();

module.exports = {
  getDashboardStats,
  getDashboardSummary,
};
