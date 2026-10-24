"use strict";

const unitService = require("../../services/goldMeasurementUnitService");

async function listUnits(req, res) {
  try {
    const units = await unitService.listUnits(req.query);
    return res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error("Error listing gold measurement units:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list gold measurement units.",
    });
  }
}

async function getUnitById(req, res) {
  try {
    const { id } = req.params;
    const unit = await unitService.getUnitById(id);
    return res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    console.error("Error fetching gold measurement unit:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch gold measurement unit.",
    });
  }
}

async function createUnit(req, res) {
  try {
    const unit = await unitService.createUnit(req.body, req.user?.user_id);
    return res.status(201).json({
      success: true,
      message: "Gold measurement unit created successfully.",
      data: unit,
    });
  } catch (error) {
    console.error("Error creating gold measurement unit:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create gold measurement unit.",
    });
  }
}

async function updateUnit(req, res) {
  try {
    const { id } = req.params;
    const unit = await unitService.updateUnit(id, req.body, req.user?.user_id);
    return res.status(200).json({
      success: true,
      message: "Gold measurement unit updated successfully.",
      data: unit,
    });
  } catch (error) {
    console.error("Error updating gold measurement unit:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update gold measurement unit.",
    });
  }
}

async function toggleUnitStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean value.",
      });
    }

    const unit = await unitService.toggleUnitStatus(id, is_active, req.user?.user_id);
    return res.status(200).json({
      success: true,
      message: `Gold measurement unit ${is_active ? "activated" : "deactivated"} successfully.`,
      data: unit,
    });
  } catch (error) {
    console.error("Error toggling gold measurement unit status:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update unit status.",
    });
  }
}

module.exports = {
  listUnits,
  getUnitById,
  createUnit,
  updateUnit,
  toggleUnitStatus,
};
