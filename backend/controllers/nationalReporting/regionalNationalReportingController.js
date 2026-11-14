"use strict";

const regionalNationalReportingService = require("../../services/regionalNationalReportingService");
const { isRegionalActor, isSuperAdminActor, isFederalActor } = require("../../utils/structureScopeUtils");

function resolveAndVerifyRegionId(req) {
  const paramRegionId = req.params.regionId || req.params.id;
  const userRegionId = req.user?.region_id;

  // 1. Super administrators, federal actors, or administrative users accessing a specific region
  if (isSuperAdminActor(req) || isFederalActor(req) || (!userRegionId && paramRegionId)) {
    return paramRegionId || userRegionId;
  }

  // 2. Regional actors are scoped to their assigned regional domain
  if (isRegionalActor(req) || userRegionId) {
    if (paramRegionId && userRegionId && paramRegionId !== userRegionId) {
      if (isSuperAdminActor(req) || isFederalActor(req)) {
        return paramRegionId;
      }
      const err = new Error("Cross-region access denied. You may only access your own regional domain.");
      err.status = 403;
      throw err;
    }
    return userRegionId || paramRegionId;
  }

  if (paramRegionId) {
    return paramRegionId;
  }

  const err = new Error("Only regional administrators or authorized personnel can perform regional reporting actions.");
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

async function getRegionReportingConfig(req, res) {
  try {
    const regionId = resolveAndVerifyRegionId(req);
    const config = await regionalNationalReportingService.getRegionReportingConfig(regionId);
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Error fetching regional reporting configuration:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch reporting configuration.",
    });
  }
}

async function updateRegionReportingConfig(req, res) {
  try {
    const regionId = resolveAndVerifyRegionId(req);
    const config = await regionalNationalReportingService.updateRegionReportingConfig(
      regionId,
      req.body,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Regional reporting configuration updated successfully.",
      data: config,
    });
  } catch (error) {
    console.error("Error updating regional reporting configuration:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update reporting configuration.",
    });
  }
}

async function submitDirectFormReport(req, res) {
  try {
    const regionId = resolveAndVerifyRegionId(req);
    const isFederalOrSuperAdmin = isSuperAdminActor(req) || isFederalActor(req);
    const result = await regionalNationalReportingService.submitDirectFormReport(
      regionId,
      req.body,
      req.user?.user_id,
      { isFederalOverride: isFederalOrSuperAdmin }
    );
    return res.status(201).json({
      success: true,
      message: result.receipt?.message || "Direct KPI form report published successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error submitting direct form report:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to submit direct form report.",
    });
  }
}

async function getSubmissionVersions(req, res) {
  try {
    const regionId = resolveAndVerifyRegionId(req);
    const versions = await regionalNationalReportingService.getSubmissionVersions({
      ...req.query,
      record_id: req.params.recordId || req.query.record_id,
      region_id: regionId,
    });
    return res.status(200).json({
      success: true,
      data: versions,
    });
  } catch (error) {
    console.error("Error retrieving regional submission versions:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to retrieve submission version history.",
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
  getRegionReportingConfig,
  updateRegionReportingConfig,
  submitDirectFormReport,
  getSubmissionVersions,
};

