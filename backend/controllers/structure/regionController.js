"use strict";

const regionService = require("../../services/regionService");
const {
  isSuperAdminActor,
  isFederalActor,
  isRegionalActor,
  isCompanyActor,
  isPurchasingCenterActor,
} = require("../../utils/structureScopeUtils");

async function listRegions(req, res) {
  try {
    // If caller is regional, restrict list to caller's own region only
    if (isRegionalActor(req)) {
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

    // Company and purchasing center accounts have no access to regional entity directory
    if (isCompanyActor(req) || isPurchasingCenterActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Non-regional accounts cannot access regional resources.",
      });
    }

    // Federal administrators with REGIONS:READ list all regions
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
    if (isRegionalActor(req)) {
      if (req.user.region_id !== id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot access a different region's details.",
        });
      }
    }

    // Company and purchasing center accounts have no access to regional entity directory
    if (isCompanyActor(req) || isPurchasingCenterActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Non-regional accounts cannot access regional resources.",
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
    // Region registration is restricted strictly to authorized federal administrators
    if (!isSuperAdminActor(req) && !isFederalActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only authorized federal administrators can register regions.",
      });
    }

    if (isRegionalActor(req) || isCompanyActor(req) || isPurchasingCenterActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only authorized federal administrators can register regions.",
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

    // Modifying region entity registry records is strictly a federal administration duty
    if (!isSuperAdminActor(req) && !isFederalActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only authorized federal administrators can modify region records.",
      });
    }

    if (isRegionalActor(req) || isCompanyActor(req) || isPurchasingCenterActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only authorized federal administrators can modify region records.",
      });
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

    if (!isSuperAdminActor(req) && !isFederalActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only authorized federal administrators can activate or deactivate regions.",
      });
    }

    if (isRegionalActor(req) || isCompanyActor(req) || isPurchasingCenterActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only authorized federal administrators can activate or deactivate regions.",
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

    if (!isSuperAdminActor(req) && !isFederalActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only authorized federal administrators can delete regions.",
      });
    }

    if (isRegionalActor(req) || isCompanyActor(req) || isPurchasingCenterActor(req)) {
      return res.status(403).json({
        success: false,
        message: "Only authorized federal administrators can delete regions.",
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
