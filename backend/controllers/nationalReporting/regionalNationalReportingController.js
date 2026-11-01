"use strict";

const regionalNationalReportingService = require("../../services/regionalNationalReportingService");
const { isRegionalActor, isSuperAdminActor } = require("../../utils/structureScopeUtils");

function resolveAndVerifyRegionId(req) {
  const paramRegionId = req.params.regionId || req.params.id;
  const userRegionId = req.user?.region_id;

  if (isSuperAdminActor(req)) {
    return paramRegionId || userRegionId;
  }

  if (isRegionalActor(req)) {
    if (!userRegionId) {
      const err = new Error("Regional account has no assigned region.");
      err.status = 403;
      throw err;
    }
    if (paramRegionId && paramRegionId !== userRegionId) {
      const err = new Error("Cross-region access denied. You may only access your own regional domain.");
      err.status = 403;
      throw err;
    }
    return userRegionId;
  }

  const err = new Error("Only regional administrators or super administrators can perform regional reporting actions.");
  err.status = 403;
  throw err;
}

async function listAssignedRequirements(req, res) {
  try {
    const regionId = resolveAndVerifyRegionId(req);
    const requirements = await regionalNationalReportingService.listAssignedRequirementsForRegion(
      regionId,
      req.query
    );
    return res.status(200).json({
      success: true,
      data: requirements,
    });
  } catch (error) {
    console.error("Error listing regional national requirements:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list assigned requirements.",
    });
  }
}

async function createPotentialMapping(req, res) {
  try {
    const regionId = resolveAndVerifyRegionId(req);
    const { assignmentId } = req.params;
    const mapping = await regionalNationalReportingService.createPotentialMapping(
      regionId,
      assignmentId,
      req.body,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Potential requirement mapping saved successfully.",
      data: mapping,
    });
  } catch (error) {
    console.error("Error creating potential mapping:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to save mapping.",
    });
  }
}

async function confirmMapping(req, res) {
  try {
    const regionId = resolveAndVerifyRegionId(req);
    const { mappingId } = req.params;
    const mapping = await regionalNationalReportingService.confirmMappingForPeriod(
      regionId,
      mappingId,
      req.body,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Requirement mapping confirmed for reporting period.",
      data: mapping,
    });
  } catch (error) {
    console.error("Error confirming requirement mapping:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to confirm mapping.",
    });
  }
}

async function deleteMapping(req, res) {
  try {
    const regionId = resolveAndVerifyRegionId(req);
    const { mappingId } = req.params;
    const result = await regionalNationalReportingService.deleteMapping(regionId, mappingId);
    return res.status(200).json({
      success: true,
      message: result.message || "Mapping deleted.",
      data: result,
    });
  } catch (error) {
    console.error("Error deleting mapping:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to delete mapping.",
    });
  }
}

async function publishValidatedReport(req, res) {
  try {
    const regionId = resolveAndVerifyRegionId(req);
    const { mappingId } = req.params;
    const result = await regionalNationalReportingService.publishValidatedReport(
      regionId,
      mappingId,
      req.body,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: result.receipt?.message || "Report published successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error publishing validated regional report:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to publish report.",
    });
  }
}

async function listPublicationHistory(req, res) {
  try {
    const regionId = resolveAndVerifyRegionId(req);
    const history = await regionalNationalReportingService.listPublicationHistoryForRegion(
      regionId,
      req.query
    );
    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error listing publication history:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list publication history.",
    });
  }
}

module.exports = {
  listAssignedRequirements,
  createPotentialMapping,
  confirmMapping,
  deleteMapping,
  publishValidatedReport,
  listPublicationHistory,
};

