"use strict";

const companyBrandingService = require("../../services/companyBrandingService");
const { Company } = require("../../models");

async function getPublicCompanyBranding(req, res) {
  try {
    const { company_id, code } = req.query;

    let targetCompanyId = company_id;
    if (!targetCompanyId && code) {
      const company = await Company.findOne({ where: { code: code.toUpperCase() } });
      if (company) {
        targetCompanyId = company.company_id;
      }
    }

    if (!targetCompanyId) {
      return res.status(400).json({
        success: false,
        message: "company_id or code query parameter is required.",
      });
    }

    const branding = await companyBrandingService.resolveEffectiveCompanyBranding(
      targetCompanyId
    );

    return res.status(200).json({
      success: true,
      data: branding,
    });
  } catch (error) {
    console.error("Error fetching public company branding:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch company branding.",
    });
  }
}

async function getCompanyBranding(req, res) {
  try {
    let companyId = req.query.company_id;

    if (req.user?.is_company) {
      if (req.query.company_id && req.query.company_id !== req.user.company_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot access another company's branding.",
        });
      }
      companyId = req.user.company_id;
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "company_id is required.",
      });
    }

    // Cross-company isolation
    if (req.user?.is_company && req.user.company_id !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot access another company's branding.",
      });
    }

    // Regional users cannot access company branding
    if (req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Regional users cannot access company branding.",
      });
    }

    const branding = await companyBrandingService.resolveEffectiveCompanyBranding(
      companyId
    );

    return res.status(200).json({
      success: true,
      data: branding,
    });
  } catch (error) {
    console.error("Error fetching company branding:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch company branding.",
    });
  }
}

async function updateCompanyBranding(req, res) {
  try {
    let companyId = req.body.company_id || req.params.company_id;

    if (req.user?.is_company) {
      if (companyId && companyId !== req.user.company_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot update branding for another company.",
        });
      }
      companyId = req.user.company_id;
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "company_id is required.",
      });
    }

    // Regional accounts cannot update company branding
    if (req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Regional users cannot modify company branding.",
      });
    }

    const updated = await companyBrandingService.updateCompanyBranding(
      companyId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Company branding updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating company branding:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update company branding.",
    });
  }
}

module.exports = {
  getPublicCompanyBranding,
  getCompanyBranding,
  updateCompanyBranding,
};
