"use strict";

const inspectionAnalyticsService = require("../../services/inspectionAnalyticsService");
const db = require("../../models");

/**
 * Validates ISO date string YYYY-MM-DD
 */
function isValidDateString(str) {
  if (!str || typeof str !== "string") return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

/**
 * Extract and validate query filters while enforcing user organizational scope
 */
function parseAndValidateFilters(req) {
  const {
    from,
    to,
    license_type = "all",
    region_id,
    team_id,
    interval = "month",
  } = req.query;

  const validLicenseTypes = new Set(["all", "mining", "exploration"]);
  const validIntervals = new Set(["day", "week", "month"]);

  if (from && !isValidDateString(from)) {
    const err = new Error("Invalid 'from' date format. Expected YYYY-MM-DD or ISO 8601 string.");
    err.status = 400;
    throw err;
  }

  if (to && !isValidDateString(to)) {
    const err = new Error("Invalid 'to' date format. Expected YYYY-MM-DD or ISO 8601 string.");
    err.status = 400;
    throw err;
  }

  if (from && to && new Date(from) > new Date(to)) {
    const err = new Error("'from' date cannot be after 'to' date.");
    err.status = 400;
    throw err;
  }

  const normalizedLicenseType = String(license_type).toLowerCase();
  if (!validLicenseTypes.has(normalizedLicenseType)) {
    const err = new Error("Invalid 'license_type'. Supported values are: all, mining, exploration.");
    err.status = 400;
    throw err;
  }

  const normalizedInterval = String(interval).toLowerCase();
  if (!validIntervals.has(normalizedInterval)) {
    const err = new Error("Invalid 'interval'. Supported values are: day, week, month.");
    err.status = 400;
    throw err;
  }

  // Strictly enforce internal federal-level users in the private section only
  const isRestrictedNonFederal =
    Boolean(req.user?.is_regional || req.user?.region_id) ||
    Boolean(req.user?.is_company || req.user?.company_id) ||
    Boolean(req.user?.is_purchasing_center || req.user?.purchasing_center_id);

  if (isRestrictedNonFederal) {
    const err = new Error(
      "Access denied: Inspection analytics are strictly restricted to internal Federal Ministry users in the private section."
    );
    err.status = 403;
    throw err;
  }

  const effectiveRegionId = region_id || undefined;

  return {
    from: from || undefined,
    to: to || undefined,
    license_type: normalizedLicenseType,
    region_id: effectiveRegionId,
    team_id: team_id || undefined,
    interval: normalizedInterval,
  };
}

/**
 * Filter regional breakdown according to user permissions
 */
function applyScopeToResult(result, user) {
  if (!result || !user?.is_regional || !user?.region_id) {
    return result;
  }

  // Regional users must only see their assigned region in regional breakdown
  const filteredRegional = (result.by_region || []).filter(
    (r) => r.region_id === user.region_id
  );

  return {
    ...result,
    by_region: filteredRegional,
  };
}

/**
 * Comprehensive analytics endpoint
 * GET /api/inspection-analytics
 */
async function getAnalytics(req, res) {
  try {
    const filters = parseAndValidateFilters(req);
    const result = await inspectionAnalyticsService.getInspectionAnalytics(filters, req.user);
    const scopedResult = applyScopeToResult(result, req.user);

    return res.status(200).json({
      success: true,
      data: scopedResult,
    });
  } catch (error) {
    console.error("[InspectionAnalyticsController] Error in getAnalytics:", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      code: error.code || "ANALYTICS_ERROR",
      message: error.message || "Failed to retrieve inspection analytics.",
    });
  }
}

/**
 * Summary metrics only
 * GET /api/inspection-analytics/summary
 */
async function getSummary(req, res) {
  try {
    const filters = parseAndValidateFilters(req);
    const result = await inspectionAnalyticsService.getInspectionAnalytics(filters, req.user);

    return res.status(200).json({
      success: true,
      data: result.summary,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[InspectionAnalyticsController] Error in getSummary:", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      code: error.code || "ANALYTICS_ERROR",
      message: error.message || "Failed to retrieve inspection summary.",
    });
  }
}

/**
 * Status breakdown only
 * GET /api/inspection-analytics/status
 */
async function getByStatus(req, res) {
  try {
    const filters = parseAndValidateFilters(req);
    const result = await inspectionAnalyticsService.getInspectionAnalytics(filters, req.user);

    return res.status(200).json({
      success: true,
      data: result.by_status,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[InspectionAnalyticsController] Error in getByStatus:", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      code: error.code || "ANALYTICS_ERROR",
      message: error.message || "Failed to retrieve status breakdown.",
    });
  }
}

/**
 * Category breakdown only
 * GET /api/inspection-analytics/category
 */
async function getByCategory(req, res) {
  try {
    const filters = parseAndValidateFilters(req);
    const result = await inspectionAnalyticsService.getInspectionAnalytics(filters, req.user);

    return res.status(200).json({
      success: true,
      data: result.by_category,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[InspectionAnalyticsController] Error in getByCategory:", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      code: error.code || "ANALYTICS_ERROR",
      message: error.message || "Failed to retrieve category breakdown.",
    });
  }
}

/**
 * Regional breakdown only
 * GET /api/inspection-analytics/region
 */
async function getByRegion(req, res) {
  try {
    const filters = parseAndValidateFilters(req);
    const result = await inspectionAnalyticsService.getInspectionAnalytics(filters, req.user);
    const scoped = applyScopeToResult(result, req.user);

    return res.status(200).json({
      success: true,
      data: scoped.by_region,
      metadata: scoped.metadata,
    });
  } catch (error) {
    console.error("[InspectionAnalyticsController] Error in getByRegion:", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      code: error.code || "ANALYTICS_ERROR",
      message: error.message || "Failed to retrieve regional breakdown.",
    });
  }
}

/**
 * Team performance breakdown only
 * GET /api/inspection-analytics/team
 */
async function getByTeam(req, res) {
  try {
    const filters = parseAndValidateFilters(req);
    const result = await inspectionAnalyticsService.getInspectionAnalytics(filters, req.user);

    return res.status(200).json({
      success: true,
      data: result.by_team,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[InspectionAnalyticsController] Error in getByTeam:", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      code: error.code || "ANALYTICS_ERROR",
      message: error.message || "Failed to retrieve team breakdown.",
    });
  }
}

/**
 * Time-series trends only
 * GET /api/inspection-analytics/trends
 */
async function getTrends(req, res) {
  try {
    const filters = parseAndValidateFilters(req);
    const result = await inspectionAnalyticsService.getInspectionAnalytics(filters, req.user);

    return res.status(200).json({
      success: true,
      data: result.trends,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[InspectionAnalyticsController] Error in getTrends:", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      code: error.code || "ANALYTICS_ERROR",
      message: error.message || "Failed to retrieve inspection trends.",
    });
  }
}

module.exports = {
  getAnalytics,
  getSummary,
  getByStatus,
  getByCategory,
  getByRegion,
  getByTeam,
  getTrends,
};

