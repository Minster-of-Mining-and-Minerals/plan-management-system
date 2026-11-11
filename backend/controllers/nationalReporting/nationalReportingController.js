"use strict";

const nationalReportingService = require("../../services/nationalReportingService");
const regionalNationalReportingService = require("../../services/regionalNationalReportingService");
const { getSupportedUnitsCatalog } = require("../../utils/nationalUnitCompatibilityUtils");

async function createRequirement(req, res) {
  try {
    const requirement = await nationalReportingService.createRequirement(
      req.body,
      req.user?.user_id
    );
    return res.status(201).json({
      success: true,
      message: "National reporting requirement created successfully.",
      data: requirement,
    });
  } catch (error) {
    console.error("Error creating national requirement:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create requirement.",
    });
  }
}

async function updateRequirement(req, res) {
  try {
    const { id } = req.params;
    const requirement = await nationalReportingService.updateRequirement(
      id,
      req.body,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "National reporting requirement updated successfully.",
      data: requirement,
    });
  } catch (error) {
    console.error("Error updating national requirement:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update requirement.",
    });
  }
}

async function deleteRequirement(req, res) {
  try {
    const { id } = req.params;
    const result = await nationalReportingService.deleteRequirement(id);
    return res.status(200).json({
      success: true,
      message: result.message || "National reporting requirement deleted.",
      data: result,
    });
  } catch (error) {
    console.error("Error deleting national requirement:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to delete requirement.",
    });
  }
}

async function listRequirements(req, res) {
  try {
    const requirements = await nationalReportingService.listRequirements(req.query);
    return res.status(200).json({
      success: true,
      data: requirements,
    });
  } catch (error) {
    console.error("Error listing national requirements:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list requirements.",
    });
  }
}

async function getRequirementById(req, res) {
  try {
    const { id } = req.params;
    const requirement = await nationalReportingService.getRequirementById(id);
    return res.status(200).json({
      success: true,
      data: requirement,
    });
  } catch (error) {
    console.error("Error fetching national requirement:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch requirement.",
    });
  }
}

async function assignRequirementToRegions(req, res) {
  try {
    const { id } = req.params;
    const assignments = await nationalReportingService.assignRequirementToRegions(
      id,
      req.body,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Requirement assigned to regional states successfully.",
      data: assignments,
    });
  } catch (error) {
    console.error("Error assigning requirement to regions:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to assign requirement to regions.",
    });
  }
}

async function updateAssignment(req, res) {
  try {
    const { assignmentId } = req.params;
    const assignment = await nationalReportingService.updateAssignment(assignmentId, req.body);
    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully.",
      data: assignment,
    });
  } catch (error) {
    console.error("Error updating assignment:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update assignment.",
    });
  }
}

async function listAssignments(req, res) {
  try {
    const assignments = await nationalReportingService.listAssignments(req.query);
    return res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    console.error("Error listing assignments:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list assignments.",
    });
  }
}

async function listPublishedRecords(req, res) {
  try {
    const records = await nationalReportingService.listPublishedRecords(req.query);
    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Error listing published records:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list published records.",
    });
  }
}

async function getPublishedRecordById(req, res) {
  try {
    const { id } = req.params;
    const record = await nationalReportingService.getPublishedRecordById(id);
    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error fetching published record:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch published record.",
    });
  }
}

async function requestClarification(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const record = await nationalReportingService.requestClarification(
      id,
      notes,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Clarification requested from region successfully.",
      data: record,
    });
  } catch (error) {
    console.error("Error requesting clarification:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to request clarification.",
    });
  }
}

async function getNationalDashboardSummary(req, res) {
  try {
    const summary = await nationalReportingService.getNationalDashboardSummary(req.query);
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error getting national dashboard summary:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to compute national dashboard summary.",
    });
  }
}

async function getUnitsCatalog(req, res) {
  try {
    const catalog = getSupportedUnitsCatalog();
    return res.status(200).json({
      success: true,
      data: catalog,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get units catalog.",
    });
  }
}

async function getRegionReportingConfig(req, res) {
  try {
    const { regionId } = req.params;
    const config = await regionalNationalReportingService.getRegionReportingConfig(regionId);
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Error getting regional reporting config:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to get regional reporting configuration.",
    });
  }
}

async function updateRegionReportingConfig(req, res) {
  try {
    const { regionId } = req.params;
    const config = await regionalNationalReportingService.updateRegionReportingConfig(
      regionId,
      req.body,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Region reporting configuration updated successfully.",
      data: config,
    });
  } catch (error) {
    console.error("Error updating regional reporting config:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update regional reporting configuration.",
    });
  }
}

async function getSubmissionVersions(req, res) {
  try {
    const regionId = req.query.region_id || (req.user?.region_id ? req.user.region_id : undefined);
    const versions = await regionalNationalReportingService.getSubmissionVersions({
      ...req.query,
      region_id: regionId,
      record_id: req.params.recordId || req.query.record_id,
    });
    return res.status(200).json({
      success: true,
      data: versions,
    });
  } catch (error) {
    console.error("Error retrieving federal submission versions:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to retrieve submission versions.",
    });
  }
}

async function togglePeriodLockOverride(req, res) {
  try {
    const { assignmentId } = req.params;
    const { periodLabel, isUnlocked, reason, unlockedUntil } = req.body;
    if (!periodLabel) {
      return res.status(400).json({
        success: false,
        message: "periodLabel is required to toggle period lock override.",
      });
    }
    const updatedAssignment = await nationalReportingService.toggleAssignmentPeriodLock(
      assignmentId,
      { periodLabel, isUnlocked, reason, unlockedUntil },
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: `Period ${periodLabel} lock override updated successfully.`,
      data: updatedAssignment,
    });
  } catch (error) {
    console.error("Error toggling period lock override:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to toggle period lock override.",
    });
  }
}

module.exports = {
  createRequirement,
  updateRequirement,
  deleteRequirement,
  listRequirements,
  getRequirementById,
  assignRequirementToRegions,
  updateAssignment,
  listAssignments,
  listPublishedRecords,
  getPublishedRecordById,
  requestClarification,
  getNationalDashboardSummary,
  getUnitsCatalog,
  getRegionReportingConfig,
  updateRegionReportingConfig,
  getSubmissionVersions,
  togglePeriodLockOverride,
};

