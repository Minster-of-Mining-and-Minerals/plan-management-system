"use strict";

const regionalBrandingService = require("../../services/regionalBrandingService");
const { Region } = require("../../models");

async function getPublicRegionalBranding(req, res) {
  try {
    const { region_id, code } = req.query;

    let targetRegionId = region_id;
    if (!targetRegionId && code) {
      const region = await Region.findOne({ where: { code: code.toUpperCase() } });
      if (region) {
        targetRegionId = region.region_id;
      }
    }

    if (!targetRegionId) {
      return res.status(400).json({
        success: false,
        message: "region_id or code query parameter is required.",
      });
    }

    const branding = await regionalBrandingService.resolveEffectiveRegionalBranding(
      targetRegionId
    );

    return res.status(200).json({
      success: true,
      data: branding,
    });
  } catch (error) {
    console.error("Error fetching public regional branding:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch regional branding.",
    });
  }
}

async function getRegionalBranding(req, res) {
  try {
    let regionId = req.query.region_id;

    if (req.user?.is_regional) {
      // Authenticated regional actor always resolves their own assigned region
      regionId = req.user.region_id;
    }

    if (!regionId) {
      return res.status(400).json({
        success: false,
        message: "region_id is required.",
      });
    }

    // Cross-region isolation
    if (req.user?.is_regional && req.user.region_id !== regionId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot access another region's branding.",
      });
    }

    const branding = await regionalBrandingService.resolveEffectiveRegionalBranding(
      regionId
    );

    return res.status(200).json({
      success: true,
      data: branding,
    });
  } catch (error) {
    console.error("Error fetching regional branding:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch regional branding.",
    });
  }
}

async function updateRegionalBranding(req, res) {
  try {
    let regionId = req.body.region_id || req.params.region_id;

    if (req.user?.is_regional) {
      if (regionId && regionId !== req.user.region_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot update branding for another region.",
        });
      }
      regionId = req.user.region_id;
    }

    if (!regionId) {
      return res.status(400).json({
        success: false,
        message: "region_id is required.",
      });
    }

    const updated = await regionalBrandingService.updateRegionalBranding(
      regionId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Regional branding settings updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating regional branding:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update regional branding.",
    });
  }
}

module.exports = {
  getPublicRegionalBranding,
  getRegionalBranding,
  updateRegionalBranding,
};
