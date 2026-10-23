"use strict";

const companyService = require("../../services/companyService");
const { isSuperAdminActor } = require("../../utils/structureScopeUtils");

async function listCompanies(req, res) {
  try {
    // If caller is company, restrict list to caller's own company only
    if (req.user?.is_company) {
      if (!req.user.company_id) {
        return res.status(403).json({
          success: false,
          message: "Company user has no assigned company.",
        });
      }
      const company = await companyService.getCompanyById(req.user.company_id);
      return res.status(200).json({
        success: true,
        data: [company],
      });
    }

    // Regional accounts have no company management access
    if (req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Regional users cannot access company domain resources.",
      });
    }

    // Federal actors with companies:read or companies:manage can list all companies
    const companies = await companyService.listCompanies(req.query);
    return res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error("Error listing companies:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list companies.",
    });
  }
}

async function getCompanyById(req, res) {
  try {
    const { id } = req.params;

    // Cross-company isolation: company users can only view their own company
    if (req.user?.is_company && req.user.company_id !== id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot access a different company's details.",
      });
    }

    // Regional users cannot access companies
    if (req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Regional users cannot access company details.",
      });
    }

    const company = await companyService.getCompanyById(id);
    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("Error fetching company:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch company.",
    });
  }
}

async function createCompany(req, res) {
  try {
    // Company registration is restricted to authorized federal administrators
    if (req.user?.is_company || req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Only authorized federal administrators can register companies.",
      });
    }

    const company = await companyService.createCompany(req.body);
    return res.status(201).json({
      success: true,
      message: "Company registered successfully.",
      data: company,
    });
  } catch (error) {
    console.error("Error creating company:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create company.",
    });
  }
}

async function updateCompany(req, res) {
  try {
    const { id } = req.params;

    // Company users can only update their own company and cannot alter code or is_active
    if (req.user?.is_company) {
      if (req.user.company_id !== id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot modify a different company.",
        });
      }
      if (req.body.is_active !== undefined || req.body.code !== undefined) {
        return res.status(403).json({
          success: false,
          message: "Only system administrators can modify company code or active status.",
        });
      }
    }

    // Regional users cannot update companies
    if (req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Regional users cannot modify companies.",
      });
    }

    const company = await companyService.updateCompany(id, req.body);
    return res.status(200).json({
      success: true,
      message: "Company updated successfully.",
      data: company,
    });
  } catch (error) {
    console.error("Error updating company:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update company.",
    });
  }
}

async function toggleCompanyActiveStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean value.",
      });
    }

    if (req.user?.is_company || req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Non-federal users cannot activate or deactivate companies.",
      });
    }

    const company = await companyService.toggleCompanyStatus(id, is_active);
    return res.status(200).json({
      success: true,
      message: `Company ${is_active ? "activated" : "deactivated"} successfully.`,
      data: company,
    });
  } catch (error) {
    console.error("Error toggling company status:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update company status.",
    });
  }
}

async function deleteCompany(req, res) {
  try {
    const { id } = req.params;

    if (req.user?.is_company || req.user?.is_regional) {
      return res.status(403).json({
        success: false,
        message: "Non-federal users cannot delete companies.",
      });
    }

    const result = await companyService.deleteCompany(id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting company:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to delete company.",
    });
  }
}

module.exports = {
  listCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  toggleCompanyActiveStatus,
  deleteCompany,
};
