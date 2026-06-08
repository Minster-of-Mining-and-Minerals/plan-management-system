"use strict";

const { sequelize } = require("../../models");
const {
  getOrCreateGlobalPlanningConfig,
  pickPlanningConfigPayload,
  DEFAULT_PLANNING_CONFIG,
} = require("../../services/planningConfigurationService");

const getPlanningConfiguration = async (req, res) => {
  try {
    const record = await getOrCreateGlobalPlanningConfig();
    return res.json({ success: true, data: pickPlanningConfigPayload(record) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updatePlanningConfiguration = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const record = await getOrCreateGlobalPlanningConfig(t);
    const nextMin = req.body.min_duration_years ?? record.min_duration_years;
    const nextMax = req.body.max_duration_years ?? record.max_duration_years;

    if (nextMin > nextMax) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Minimum duration cannot exceed maximum duration.",
      });
    }

    await record.update(
      {
        min_duration_years: nextMin,
        max_duration_years: nextMax,
        draft_entity_label_singular:
          req.body.draft_entity_label_singular ?? record.draft_entity_label_singular,
        draft_entity_label_plural:
          req.body.draft_entity_label_plural ?? record.draft_entity_label_plural,
        create_action_label: req.body.create_action_label ?? record.create_action_label,
        planning_period_label:
          req.body.planning_period_label ?? record.planning_period_label,
        duration_label: req.body.duration_label ?? record.duration_label,
        start_year_label: req.body.start_year_label ?? record.start_year_label,
        end_year_label: req.body.end_year_label ?? record.end_year_label,
      },
      { transaction: t }
    );

    await t.commit();
    return res.json({
      success: true,
      message: "Planning configuration updated",
      data: pickPlanningConfigPayload(record),
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

const restoreDefaultPlanningConfiguration = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const record = await getOrCreateGlobalPlanningConfig(t);
    await record.update(
      {
        min_duration_years: DEFAULT_PLANNING_CONFIG.min_duration_years,
        max_duration_years: DEFAULT_PLANNING_CONFIG.max_duration_years,
        draft_entity_label_singular: DEFAULT_PLANNING_CONFIG.draft_entity_label_singular,
        draft_entity_label_plural: DEFAULT_PLANNING_CONFIG.draft_entity_label_plural,
        create_action_label: DEFAULT_PLANNING_CONFIG.create_action_label,
        planning_period_label: DEFAULT_PLANNING_CONFIG.planning_period_label,
        duration_label: DEFAULT_PLANNING_CONFIG.duration_label,
        start_year_label: DEFAULT_PLANNING_CONFIG.start_year_label,
        end_year_label: DEFAULT_PLANNING_CONFIG.end_year_label,
      },
      { transaction: t }
    );
    await t.commit();
    return res.json({
      success: true,
      message: "Planning configuration restored to defaults",
      data: pickPlanningConfigPayload(record),
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPlanningConfiguration,
  updatePlanningConfiguration,
  restoreDefaultPlanningConfiguration,
};
