"use strict";

const purchasingCenterService = require("../../services/purchasingCenterService");
const { assertPurchasingCenterAccessible } = require("../../utils/structureScopeUtils");

async function listPurchasingCenters(req, res) {
  try {
    // If caller is purchasing center user, restrict list to caller's own purchasing center only
    if (req.user?.is_purchasing_center) {
      if (!req.user.purchasing_center_id) {
        return res.status(403).json({
          success: false,
          message: "Purchasing center user has no assigned purchasing center.",
        });
      }
      const pc = await purchasingCenterService.getPurchasingCenterById(req.user.purchasing_center_id);
      return res.status(200).json({
        success: true,
        data: [pc],
      });
    }

    // Federal actors with purchasing_centers:read can list all purchasing centers
    const list = await purchasingCenterService.listPurchasingCenters(req.query);
    return res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error listing purchasing centers:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list purchasing centers.",
    });
  }
}

async function getPurchasingCenterById(req, res) {
  try {
    const { id } = req.params;

    // Cross-purchasing-center isolation
    if (req.user?.is_purchasing_center && req.user.purchasing_center_id !== id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot access a different purchasing center's details.",
      });
    }

    assertPurchasingCenterAccessible(req, id, "read");

    const pc = await purchasingCenterService.getPurchasingCenterById(id);
    return res.status(200).json({
      success: true,
      data: pc,
    });
  } catch (error) {
    console.error("Error fetching purchasing center:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch purchasing center.",
    });
  }
}

async function createPurchasingCenter(req, res) {
  try {
    if (req.user?.is_purchasing_center || req.user?.is_regional || req.user?.is_company) {
      return res.status(403).json({
        success: false,
        message: "Only authorized federal administrators can create purchasing centers.",
      });
    }

    const pc = await purchasingCenterService.createPurchasingCenter(req.body);
    return res.status(201).json({
      success: true,
      message: "Purchasing center registered successfully.",
      data: pc,
    });
  } catch (error) {
    console.error("Error creating purchasing center:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create purchasing center.",
    });
  }
}

async function updatePurchasingCenter(req, res) {
  try {
    const { id } = req.params;

    if (req.user?.is_purchasing_center) {
      if (req.user.purchasing_center_id !== id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot modify a different purchasing center.",
        });
      }
      if (req.body.is_active !== undefined || req.body.code !== undefined) {
        return res.status(403).json({
          success: false,
          message: "Only system administrators can modify purchasing center code or active status.",
        });
      }
    }

    assertPurchasingCenterAccessible(req, id, "manage");

    const pc = await purchasingCenterService.updatePurchasingCenter(id, req.body);
    return res.status(200).json({
      success: true,
      message: "Purchasing center updated successfully.",
      data: pc,
    });
  } catch (error) {
    console.error("Error updating purchasing center:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update purchasing center.",
    });
  }
}

async function togglePurchasingCenterActiveStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean value.",
      });
    }

    if (req.user?.is_purchasing_center || req.user?.is_regional || req.user?.is_company) {
      return res.status(403).json({
        success: false,
        message: "Only federal administrators can activate or deactivate purchasing centers.",
      });
    }

    const pc = await purchasingCenterService.togglePurchasingCenterStatus(id, is_active);
    return res.status(200).json({
      success: true,
      message: `Purchasing center ${is_active ? "activated" : "deactivated"} successfully.`,
      data: pc,
    });
  } catch (error) {
    console.error("Error toggling purchasing center status:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update purchasing center status.",
    });
  }
}

async function deletePurchasingCenter(req, res) {
  try {
    const { id } = req.params;

    if (req.user?.is_purchasing_center || req.user?.is_regional || req.user?.is_company) {
      return res.status(403).json({
        success: false,
        message: "Only federal administrators can delete purchasing centers.",
      });
    }

    const result = await purchasingCenterService.deletePurchasingCenter(id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting purchasing center:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to delete purchasing center.",
    });
  }
}

module.exports = {
  listPurchasingCenters,
  getPurchasingCenterById,
  createPurchasingCenter,
  updatePurchasingCenter,
  togglePurchasingCenterActiveStatus,
  deletePurchasingCenter,
};
