"use strict";

const companyStructureService = require("../../services/companyStructureService");
const { assertCompanyAccessible } = require("../../utils/structureScopeUtils");

async function listStructures(req, res) {
  try {
    let companyId = req.query.company_id;

    if (req.user?.is_company) {
      if (req.query.company_id && req.query.company_id !== req.user.company_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot access departments of another company.",
        });
      }
      companyId = req.user.company_id;
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "company_id query parameter is required.",
      });
    }

    assertCompanyAccessible(req, companyId, "read");

    const structures = await companyStructureService.listCompanyStructures(
      companyId,
      req.query
    );

    return res.status(200).json({
      success: true,
      data: structures,
    });
  } catch (error) {
    console.error("Error listing company structures:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list company structures.",
    });
  }
}

async function getStructureById(req, res) {
  try {
    const { id } = req.params;
    const structure = await companyStructureService.getCompanyStructureById(id);

    assertCompanyAccessible(req, structure.company_id, "read");

    return res.status(200).json({
      success: true,
      data: structure,
    });
  } catch (error) {
    console.error("Error fetching company structure:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch company structure.",
    });
  }
}

async function createStructure(req, res) {
  try {
    let companyId = req.body.company_id;

    if (req.user?.is_company) {
      if (req.body.company_id && req.body.company_id !== req.user.company_id) {
        return res.status(403).json({
          success: false,
          message: "Cannot create departments for another company.",
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

    assertCompanyAccessible(req, companyId, "create");

    const structure = await companyStructureService.createCompanyStructure(
      companyId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Company department created successfully.",
      data: structure,
    });
  } catch (error) {
    console.error("Error creating company structure:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create company department.",
    });
  }
}

async function updateStructure(req, res) {
  try {
    const { id } = req.params;
    const existing = await companyStructureService.getCompanyStructureById(id);

    assertCompanyAccessible(req, existing.company_id, "update");

    const structure = await companyStructureService.updateCompanyStructure(
      id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Company department updated successfully.",
      data: structure,
    });
  } catch (error) {
    console.error("Error updating company structure:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update company department.",
    });
  }
}

async function deleteStructure(req, res) {
  try {
    const { id } = req.params;
    const existing = await companyStructureService.getCompanyStructureById(id);

    assertCompanyAccessible(req, existing.company_id, "delete");

    const result = await companyStructureService.deleteCompanyStructure(id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting company structure:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to delete company department.",
    });
  }
}

module.exports = {
  listStructures,
  getStructureById,
  createStructure,
  updateStructure,
  deleteStructure,
};
