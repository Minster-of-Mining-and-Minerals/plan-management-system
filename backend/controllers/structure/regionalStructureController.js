"use strict";

const regionalStructureService = require("../../services/regionalStructureService");
const { assertRegionAccessible } = require("../../utils/structureScopeUtils");

async function listStructures(req, res) {
  try {
    let regionId = req.query.region_id;

    if (req.user?.is_regional) {
      if (req.query.region_id && req.query.region_id !== req.user.region_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot access departments of another region.",
        });
      }
      regionId = req.user.region_id;
    }

    if (!regionId) {
      return res.status(400).json({
        success: false,
        message: "region_id query parameter is required.",
      });
    }

    assertRegionAccessible(req, regionId, "read");

    const structures = await regionalStructureService.listRegionalStructures(
      regionId,
      req.query
    );

    return res.status(200).json({
      success: true,
      data: structures,
    });
  } catch (error) {
    console.error("Error listing regional structures:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list regional structures.",
    });
  }
}

async function getStructureById(req, res) {
  try {
    const { id } = req.params;
    const structure = await regionalStructureService.getRegionalStructureById(id);

    assertRegionAccessible(req, structure.region_id, "read");

    return res.status(200).json({
      success: true,
      data: structure,
    });
  } catch (error) {
    console.error("Error fetching regional structure:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch regional structure.",
    });
  }
}

async function createStructure(req, res) {
  try {
    let regionId = req.body.region_id;

    if (req.user?.is_regional) {
      // Regional user cannot create departments for other regions
      if (req.body.region_id && req.body.region_id !== req.user.region_id) {
        return res.status(403).json({
          success: false,
          message: "Cannot create departments for another region.",
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

    assertRegionAccessible(req, regionId, "create");

    const structure = await regionalStructureService.createRegionalStructure(
      regionId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Regional department created successfully.",
      data: structure,
    });
  } catch (error) {
    console.error("Error creating regional structure:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create regional department.",
    });
  }
}

async function updateStructure(req, res) {
  try {
    const { id } = req.params;
    const existing = await regionalStructureService.getRegionalStructureById(id);

    assertRegionAccessible(req, existing.region_id, "update");

    const structure = await regionalStructureService.updateRegionalStructure(
      id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Regional department updated successfully.",
      data: structure,
    });
  } catch (error) {
    console.error("Error updating regional structure:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update regional department.",
    });
  }
}

async function deleteStructure(req, res) {
  try {
    const { id } = req.params;
    const existing = await regionalStructureService.getRegionalStructureById(id);

    assertRegionAccessible(req, existing.region_id, "delete");

    const result = await regionalStructureService.deleteRegionalStructure(id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting regional structure:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to delete regional department.",
    });
  }
}

async function assignUsers(req, res) {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;

    const existing = await regionalStructureService.getRegionalStructureById(id);
    assertRegionAccessible(req, existing.region_id, "update");

    const structure = await regionalStructureService.assignUsersToRegionalStructure(
      id,
      user_ids
    );

    return res.status(200).json({
      success: true,
      message: "Users assigned to regional department successfully.",
      data: structure,
    });
  } catch (error) {
    console.error("Error assigning users to department:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to assign users to department.",
    });
  }
}

async function removeUser(req, res) {
  try {
    const { id, user_id } = req.params;
    const existing = await regionalStructureService.getRegionalStructureById(id);
    assertRegionAccessible(req, existing.region_id, "update");

    const result = await regionalStructureService.removeUserFromRegionalStructure(
      id,
      user_id
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error removing user from department:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to remove user from department.",
    });
  }
}

module.exports = {
  listStructures,
  getStructureById,
  createStructure,
  updateStructure,
  deleteStructure,
  assignUsers,
  removeUser,
};
