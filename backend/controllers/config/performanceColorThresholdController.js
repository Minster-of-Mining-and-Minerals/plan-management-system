"use strict";

const { v4: uuidv4 } = require("uuid");
const { PerformanceColorThreshold, sequelize } = require("../../models");
const {
  resolveThresholdForPercentage,
} = require("../../services/performanceColorService");

const getPerformanceColorThresholds = async (req, res) => {
  try {
    const { is_active } = req.query;
    const where = {};
    if (is_active !== undefined) where.is_active = is_active === "true";

    const thresholds = await PerformanceColorThreshold.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["min_percentage", "ASC"],
      ],
    });

    return res.json({ success: true, data: thresholds });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getPerformanceColorThresholdById = async (req, res) => {
  try {
    const threshold = await PerformanceColorThreshold.findByPk(req.params.id);
    if (!threshold) {
      return res.status(404).json({ message: "Performance color threshold not found" });
    }
    return res.json({ success: true, data: threshold });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const resolvePerformanceColor = async (req, res) => {
  try {
    const percentage = Number(req.query.percentage);
    if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
      return res.status(400).json({
        success: false,
        message: "percentage query param must be between 0 and 100",
      });
    }

    const thresholds = await PerformanceColorThreshold.findAll({
      where: { is_active: true },
      order: [
        ["sort_order", "ASC"],
        ["min_percentage", "ASC"],
      ],
    });

    const match = resolveThresholdForPercentage(thresholds, percentage);

    return res.json({
      success: true,
      data: {
        percentage: Math.round(percentage),
        threshold: match,
        color_hex: match?.color_hex ?? "#6B7280",
        label: match?.label ?? "Unknown",
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const createPerformanceColorThreshold = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { label, min_percentage, max_percentage, color_hex, sort_order, is_active } =
      req.body;

    const threshold = await PerformanceColorThreshold.create(
      {
        performance_color_threshold_id: uuidv4(),
        label,
        min_percentage,
        max_percentage,
        color_hex: color_hex.toUpperCase(),
        sort_order: sort_order ?? min_percentage,
        is_active: is_active !== undefined ? is_active : true,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({
      success: true,
      message: "Performance color threshold created",
      data: threshold,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

const updatePerformanceColorThreshold = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const threshold = await PerformanceColorThreshold.findByPk(req.params.id, {
      transaction: t,
    });
    if (!threshold) {
      await t.rollback();
      return res.status(404).json({ message: "Performance color threshold not found" });
    }

    const updates = { ...req.body };
    if (updates.color_hex) updates.color_hex = updates.color_hex.toUpperCase();

    await threshold.update(updates, { transaction: t });
    await t.commit();

    return res.json({
      success: true,
      message: "Performance color threshold updated",
      data: threshold,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

const deletePerformanceColorThreshold = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const threshold = await PerformanceColorThreshold.findByPk(req.params.id, {
      transaction: t,
    });
    if (!threshold) {
      await t.rollback();
      return res.status(404).json({ message: "Performance color threshold not found" });
    }

    await threshold.destroy({ transaction: t });
    await t.commit();

    return res.json({
      success: true,
      message: "Performance color threshold deleted",
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPerformanceColorThresholds,
  getPerformanceColorThresholdById,
  resolvePerformanceColor,
  createPerformanceColorThreshold,
  updatePerformanceColorThreshold,
  deletePerformanceColorThreshold,
};
