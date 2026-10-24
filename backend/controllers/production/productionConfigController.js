"use strict";

const productionConfigService = require("../../services/production/productionConfigService");

/**
 * List all production items.
 */
async function listProductionItemsHandler(req, res, next) {
  try {
    const items = await productionConfigService.listProductionItems(req.query);
    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single production item by ID.
 */
async function getProductionItemByIdHandler(req, res, next) {
  try {
    const item = await productionConfigService.getProductionItemById(req.params.id);
    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new production item.
 */
async function createProductionItemHandler(req, res, next) {
  try {
    const item = await productionConfigService.createProductionItem(
      req.body,
      req.user ? req.user.user_id : null
    );
    return res.status(201).json({
      success: true,
      message: "Production item created successfully.",
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing production item.
 */
async function updateProductionItemHandler(req, res, next) {
  try {
    const item = await productionConfigService.updateProductionItem(
      req.params.id,
      req.body,
      req.user ? req.user.user_id : null
    );
    return res.status(200).json({
      success: true,
      message: "Production item updated successfully.",
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a production item.
 */
async function deleteProductionItemHandler(req, res, next) {
  try {
    const result = await productionConfigService.deleteProductionItem(req.params.id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Convert quantity between units for an item.
 */
async function convertQuantityHandler(req, res, next) {
  try {
    const result = await productionConfigService.convertQuantity(req.body);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List reporting frequencies.
 */
async function listFrequenciesHandler(req, res, next) {
  try {
    const frequencies = await productionConfigService.listFrequencies();
    return res.status(200).json({
      success: true,
      data: frequencies,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a reporting frequency.
 */
async function createFrequencyHandler(req, res, next) {
  try {
    const freq = await productionConfigService.createFrequency(req.body);
    return res.status(201).json({
      success: true,
      message: "Reporting frequency created successfully.",
      data: freq,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a reporting frequency.
 */
async function updateFrequencyHandler(req, res, next) {
  try {
    const freq = await productionConfigService.updateFrequency(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Reporting frequency updated successfully.",
      data: freq,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Dynamically generate target period structures.
 */
async function generateTargetPeriodsHandler(req, res, next) {
  try {
    const periods = productionConfigService.generateTargetPeriods(req.query);
    return res.status(200).json({
      success: true,
      data: periods,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProductionItemsHandler,
  getProductionItemByIdHandler,
  createProductionItemHandler,
  updateProductionItemHandler,
  deleteProductionItemHandler,
  convertQuantityHandler,
  listFrequenciesHandler,
  createFrequencyHandler,
  updateFrequencyHandler,
  generateTargetPeriodsHandler,
};
