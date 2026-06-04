"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

module.exports = {
  async up(queryInterface) {
    const existing = await queryInterface.sequelize.query(
      `SELECT performance_color_threshold_id FROM performance_color_thresholds LIMIT 1`,
      { type: QueryTypes.SELECT }
    );
    if (existing.length > 0) return;

    const now = new Date();
    const thresholds = [
      { label: "No Performance", min: 0, max: 0, color: "#DC2626", sort: 1 },
      { label: "Very Poor", min: 1, max: 24, color: "#EF4444", sort: 2 },
      { label: "Poor", min: 25, max: 49, color: "#F97316", sort: 3 },
      { label: "Average", min: 50, max: 69, color: "#EAB308", sort: 4 },
      { label: "Good", min: 70, max: 84, color: "#22C55E", sort: 5 },
      { label: "Very Good", min: 85, max: 99, color: "#16A34A", sort: 6 },
      { label: "Completed", min: 100, max: 100, color: "#15803D", sort: 7 },
    ].map((t) => ({
      performance_color_threshold_id: uuidv4(),
      label: t.label,
      min_percentage: t.min,
      max_percentage: t.max,
      color_hex: t.color,
      sort_order: t.sort,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert("performance_color_thresholds", thresholds, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("performance_color_thresholds", null, {});
  },
};
