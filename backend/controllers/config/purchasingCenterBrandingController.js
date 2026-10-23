"use strict";

const purchasingCenterBrandingService = require("../../services/purchasingCenterBrandingService");
const { PurchasingCenter } = require("../../models");
const { assertPurchasingCenterAccessible } = require("../../utils/structureScopeUtils");

async function getPublicPurchasingCenterBranding(req, res) {
  try {
    const { purchasing_center_id, code } = req.query;

    let targetId = purchasing_center_id;
    if (!targetId && code) {
      const pc = await PurchasingCenter.findOne({ where: { code: code.toUpperCase() } });
      if (pc) {
        targetId = pc.purchasing_center_id;
      }
    }

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: "purchasing_center_id or code query parameter is required.",
      });
    }

    const branding = await purchasingCenterBrandingService.resolveEffectiveBranding(targetId);

    return res.status(200).json({
      success: true,
      data: branding,
    });
  } catch (error) {
    console.error("Error fetching public purchasing center branding:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch purchasing center branding.",
    });
  }
}

async function getPurchasingCenterBranding(req, res) {
  try {
    let pcId = req.query.purchasing_center_id;

    if (req.user?.is_purchasing_center) {
      if (req.query.purchasing_center_id && req.query.purchasing_center_id !== req.user.purchasing_center_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot access another purchasing center's branding.",
        });
      }
      pcId = req.user.purchasing_center_id;
    }

    if (!pcId) {
      return res.status(400).json({
        success: false,
        message: "purchasing_center_id is required.",
      });
    }

    assertPurchasingCenterAccessible(req, pcId, "read");

    const branding = await purchasingCenterBrandingService.resolveEffectiveBranding(pcId);

    return res.status(200).json({
      success: true,
      data: branding,
    });
  } catch (error) {
    console.error("Error fetching purchasing center branding:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch purchasing center branding.",
    });
  }
}

async function updatePurchasingCenterBranding(req, res) {
  try {
    let pcId = req.body.purchasing_center_id || req.params.purchasing_center_id;

    if (req.user?.is_purchasing_center) {
      if (pcId && pcId !== req.user.purchasing_center_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot update branding for another purchasing center.",
        });
      }
      pcId = req.user.purchasing_center_id;
    }

    if (!pcId) {
      return res.status(400).json({
        success: false,
        message: "purchasing_center_id is required.",
      });
    }

    assertPurchasingCenterAccessible(req, pcId, "manage");

    const updated = await purchasingCenterBrandingService.updateBranding(pcId, req.body);

    return res.status(200).json({
      success: true,
      message: "Purchasing center branding settings updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating purchasing center branding:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update purchasing center branding.",
    });
  }
}

module.exports = {
  getPublicPurchasingCenterBranding,
  getPurchasingCenterBranding,
  updatePurchasingCenterBranding,
};
