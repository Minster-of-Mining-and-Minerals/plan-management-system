"use strict";

const goldPurchaseService = require("../../services/goldPurchaseService");

async function recordPurchase(req, res) {
  try {
    const purchase = await goldPurchaseService.recordPurchase(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: "Gold purchase recorded successfully.",
      data: purchase,
    });
  } catch (error) {
    console.error("Error recording gold purchase:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to record gold purchase.",
    });
  }
}

async function listPurchases(req, res) {
  try {
    const results = await goldPurchaseService.listPurchases(req.query, req.user);
    return res.status(200).json({
      success: true,
      data: results.items,
      pagination: {
        total: results.total,
        page: results.page,
        limit: results.limit,
        total_pages: results.total_pages,
      },
    });
  } catch (error) {
    console.error("Error listing gold purchases:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list gold purchases.",
    });
  }
}

async function getPurchaseById(req, res) {
  try {
    const { id } = req.params;
    const purchase = await goldPurchaseService.getPurchaseById(id, req.user);
    return res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    console.error("Error fetching gold purchase details:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch gold purchase details.",
    });
  }
}

async function cancelPurchase(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const purchase = await goldPurchaseService.cancelPurchase(id, reason, req.user);
    return res.status(200).json({
      success: true,
      message: "Gold purchase cancelled successfully.",
      data: purchase,
    });
  } catch (error) {
    console.error("Error cancelling gold purchase:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to cancel gold purchase.",
    });
  }
}

module.exports = {
  recordPurchase,
  listPurchases,
  getPurchaseById,
  cancelPurchase,
};
