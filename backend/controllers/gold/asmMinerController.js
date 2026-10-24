"use strict";

const asmMinerService = require("../../services/asmMinerService");

async function searchCandidates(req, res) {
  try {
    const results = await asmMinerService.searchCandidates(req.query);
    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error searching ASM candidates:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to search ASM candidates.",
    });
  }
}

async function listMiners(req, res) {
  try {
    const results = await asmMinerService.listMiners(req.query);
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
    console.error("Error listing ASM miners:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list ASM miners.",
    });
  }
}

async function getMinerById(req, res) {
  try {
    const { id } = req.params;
    const miner = await asmMinerService.getMinerById(id);
    return res.status(200).json({
      success: true,
      data: miner,
    });
  } catch (error) {
    console.error("Error fetching ASM miner:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch ASM miner.",
    });
  }
}

async function registerMiner(req, res) {
  try {
    const miner = await asmMinerService.registerMiner(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: "Artisanal and Small-Scale Miner (ASM) registered successfully.",
      data: miner,
    });
  } catch (error) {
    console.error("Error registering ASM miner:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to register ASM miner.",
    });
  }
}

async function updateMiner(req, res) {
  try {
    const { id } = req.params;
    const miner = await asmMinerService.updateMiner(id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: "ASM miner updated successfully.",
      data: miner,
    });
  } catch (error) {
    console.error("Error updating ASM miner:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update ASM miner.",
    });
  }
}

async function toggleMinerStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean value.",
      });
    }

    const miner = await asmMinerService.toggleMinerStatus(id, is_active, req.user);
    return res.status(200).json({
      success: true,
      message: `ASM miner ${is_active ? "activated" : "deactivated"} successfully.`,
      data: miner,
    });
  } catch (error) {
    console.error("Error toggling ASM miner status:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to toggle ASM miner status.",
    });
  }
}

module.exports = {
  searchCandidates,
  listMiners,
  getMinerById,
  registerMiner,
  updateMiner,
  toggleMinerStatus,
};
