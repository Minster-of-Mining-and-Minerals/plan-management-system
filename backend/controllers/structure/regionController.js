"use strict";

const regionService = require("../../services/regionService");
const { isSuperAdminActor } = require("../../utils/structureScopeUtils");

async function listRegions(req, res) {
  try {
    // If caller is regional, restrict list to caller's own region only
    if (req.user?.is_regional) {
      if (!req.user.region_id) {
        return res.status(403).json({
          success: false,
          message: "Regional user has no assigned region.",
        });
      }
      const region = await regionService.getRegionById(req.user.region_id);
      return res.status(200).json({
        success: true,
        data: [region],
      });
    }

    // Federal actors with regions:read can list all regions
    const regions = await regionService.listRegions(req.query);
    return res.status(200).json({
      success: true,
      data: regions,
    });
  } catch (error) {
    console.error("Error listing regions:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list regions.",
    });
  }
}

async function getRegionById(req, res) {
  try {
    const { id } = req.params;

    // Cross-region isolation: regional users can only view their own region
    if (req.user?.is_regional && req.user.region_id !== id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot access a different region's details.",
      });
    }

    const region = await regionService.getRegionById(id);
    return res.status(200).json({
      success: true,
      data: region,
    });
  } catch (error) {
    console.error("Error fetching region:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch region.",
    });
  }
}

async function createRegion(req, res) {
  try {
    // Region registration is restricted to system administrators (federal platform admins)
    if (req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Regional users cannot register new regions.",
      });
    }

    const region = await regionService.createRegion(req.body);
    return res.status(201).json({
      success: true,
      message: "Region registered successfully.",
      data: region,
    });
  } catch (error) {
    console.error("Error creating region:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create region.",
    });
  }
}

async function updateRegion(req, res) {
  try {
    const { id } = req.params;

    // Regional users can only update their own region and cannot alter code or is_active
    if (req.user?.is_regional) {
      if (req.user.region_id !== id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot modify a different region.",
        });
      }
      if (req.body.is_active !== undefined || req.body.code !== undefined) {
        return res.status(403).json({
          success: false,
          message: "Only system administrators can modify region code or active status.",
        });
      }
    }

    const region = await regionService.updateRegion(id, req.body);
    return res.status(200).json({
      success: true,
      message: "Region updated successfully.",
      data: region,
    });
  } catch (error) {
    console.error("Error updating region:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update region.",
    });
  }
}

async function toggleRegionActiveStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean value.",
      });
    }

    if (req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Regional users cannot activate or deactivate regions.",
      });
    }

    const region = await regionService.setRegionActiveStatus(id, is_active);
    return res.status(200).json({
      success: true,
      message: `Region ${is_active ? "activated" : "deactivated"} successfully.`,
      data: region,
    });
  } catch (error) {
    console.error("Error toggling region status:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update region status.",
    });
  }
}

async function deleteRegion(req, res) {
  try {
    const { id } = req.params;

    if (req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Regional users cannot delete regions.",
      });
    }

    const result = await regionService.deleteRegion(id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting region:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to delete region.",
    });
  }
}

module.exports = {
  listRegions,
  getRegionById,
  createRegion,
  updateRegion,
  toggleRegionActiveStatus,
  deleteRegion,
};
