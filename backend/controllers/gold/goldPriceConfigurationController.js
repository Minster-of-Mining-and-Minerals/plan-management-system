"use strict";

const service = require("../../services/goldPriceConfigurationService");

async function listPriceConfigurations(req, res) {
  try {
    const items = await service.listPriceConfigurations(req.query, req.user);
    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Error listing gold price configurations:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list gold price configurations.",
    });
  }
}

async function getActivePriceConfig(req, res) {
  try {
    const config = await service.getActivePriceConfiguration(req.query);
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Error fetching active gold price configuration:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch active gold price configuration.",
    });
  }
}

async function createPriceConfiguration(req, res) {
  try {
    const config = await service.createPriceConfiguration(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: "Gold price configuration created successfully.",
      data: config,
    });
  } catch (error) {
    console.error("Error creating gold price configuration:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create gold price configuration.",
    });
  }
}

async function updatePriceConfiguration(req, res) {
  try {
    const { id } = req.params;
    const config = await service.updatePriceConfiguration(id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: "Gold price configuration updated successfully.",
      data: config,
    });
  } catch (error) {
    console.error("Error updating gold price configuration:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update gold price configuration.",
    });
  }
}

async function deletePriceConfiguration(req, res) {
  try {
    const { id } = req.params;
    const result = await service.deletePriceConfiguration(id, req.user);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting gold price configuration:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to delete gold price configuration.",
    });
  }
}

module.exports = {
  listPriceConfigurations,
  getActivePriceConfig,
  createPriceConfiguration,
  updatePriceConfiguration,
  deletePriceConfiguration,
};
