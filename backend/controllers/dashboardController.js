"use strict";

const dashboardAnalyticsService = require("../services/analytics/dashboardAnalyticsService");
const dashboardService = require("../services/dashboardService");

const getExecutiveOverview = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getExecutiveOverview(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Executive overview analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve executive overview analytics.",
      error: err.message,
    });
  }
};

const getOperationalDashboard = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getOperationalDashboard(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Operational dashboard analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve operational dashboard analytics.",
      error: err.message,
    });
  }
};

const getClinicalAnalytics = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getClinicalAnalytics(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Clinical analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve clinical analytics.",
      error: err.message,
    });
  }
};

const getFinancialAnalytics = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getFinancialAnalytics(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Financial analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve financial analytics.",
      error: err.message,
    });
  }
};

const getEncounterPipeline = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getEncounterPipeline(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Encounter pipeline analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve encounter pipeline analytics.",
      error: err.message,
    });
  }
};

const getQueueMonitoring = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getQueueMonitoring(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Queue monitoring analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve queue monitoring analytics.",
      error: err.message,
    });
  }
};

const getDoctorProductivity = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getDoctorProductivity(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Doctor productivity analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve doctor productivity analytics.",
      error: err.message,
    });
  }
};

const getNurseMetrics = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getNurseMetrics(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Nurse metrics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve nurse metrics.",
      error: err.message,
    });
  }
};

const getLaboratoryIntelligence = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getLaboratoryIntelligence(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Laboratory intelligence analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve laboratory intelligence analytics.",
      error: err.message,
    });
  }
};

const getRadiologyIntelligence = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getRadiologyIntelligence(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Radiology intelligence analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve radiology intelligence analytics.",
      error: err.message,
    });
  }
};

const getPharmacyIntelligence = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getPharmacyIntelligence(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Pharmacy intelligence analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pharmacy intelligence analytics.",
      error: err.message,
    });
  }
};

const getFinancialExecutive = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getFinancialExecutive(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Financial executive analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve financial executive analytics.",
      error: err.message,
    });
  }
};

const getDepartmentPerformance = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getDepartmentPerformance(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Department performance analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve department performance analytics.",
      error: err.message,
    });
  }
};

const getDiagnosisIntelligence = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getDiagnosisIntelligence(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Diagnosis intelligence analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve diagnosis intelligence analytics.",
      error: err.message,
    });
  }
};

const getClinicalOrderIntelligence = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getClinicalOrderIntelligence(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Clinical order intelligence analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve clinical order intelligence analytics.",
      error: err.message,
    });
  }
};

const getCareContinuity = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getCareContinuityAnalytics(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Care continuity analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve care continuity analytics.",
      error: err.message,
    });
  }
};

const getTimelineIntelligence = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getTimelineIntelligence(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Timeline intelligence analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve timeline intelligence analytics.",
      error: err.message,
    });
  }
};

const getFacilityStats = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getFacilityStatistics(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: "Facility statistics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve facility statistics.",
      error: err.message,
    });
  }
};

const getDrillDownRecords = async (req, res) => {
  try {
    const { metricKey } = req.params;
    const result = await dashboardAnalyticsService.getDrillDownRecords(metricKey, req.query);
    return res.status(200).json({
      success: true,
      message: "Drill-down records retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve drill-down records.",
      error: err.message,
    });
  }
};

const getRoleViewDashboard = async (req, res) => {
  try {
    const result = await dashboardAnalyticsService.getRoleDashboard(req.user);
    return res.status(200).json({
      success: true,
      message: "Role-tailored dashboard analytics retrieved successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve role-tailored dashboard analytics.",
      error: err.message,
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const stats = await dashboardService.getStats(req.user);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    try {
      const fallbackStats = await dashboardAnalyticsService.getExecutiveOverview(req.query, req.user);
      return res.status(200).json({
        success: true,
        data: fallbackStats,
      });
    } catch (fallbackErr) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
};

module.exports = {
  getExecutiveOverview,
  getOperationalDashboard,
  getClinicalAnalytics,
  getFinancialAnalytics,
  getEncounterPipeline,
  getQueueMonitoring,
  getDoctorProductivity,
  getNurseMetrics,
  getLaboratoryIntelligence,
  getRadiologyIntelligence,
  getPharmacyIntelligence,
  getFinancialExecutive,
  getDepartmentPerformance,
  getDiagnosisIntelligence,
  getClinicalOrderIntelligence,
  getCareContinuity,
  getTimelineIntelligence,
  getFacilityStats,
  getDrillDownRecords,
  getRoleViewDashboard,
  getDashboardStats,
};
