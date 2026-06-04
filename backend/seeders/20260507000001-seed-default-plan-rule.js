"use strict";

const { v4: uuidv4 } = require("uuid");

const DEFAULT_RULE_ID = "60000000-0000-4000-8000-000000000001";

const STEPS = [
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000011",
    step_order: 1,
    node_type: "strategic",
    label: "Strategic Focus Area",
    requires_weight: false,
  },
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000012",
    step_order: 2,
    node_type: "goal",
    label: "Goal",
    requires_weight: true,
  },
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000013",
    step_order: 3,
    node_type: "kpi",
    label: "KPI / Indicator",
    requires_weight: true,
  },
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000014",
    step_order: 4,
    node_type: "task",
    label: "Task / Activity",
    requires_weight: true,
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const existing = await queryInterface.sequelize.query(
      `SELECT plan_rule_id FROM plan_rules WHERE plan_rule_id = :id LIMIT 1`,
      {
        replacements: { id: DEFAULT_RULE_ID },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (existing.length > 0) {
      console.log("Default plan rule already seeded — skipping.");
      return;
    }

    await queryInterface.bulkInsert("plan_rules", [
      {
        plan_rule_id: DEFAULT_RULE_ID,
        name: "Standard 4-Level Plan",
        government_structure_id: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert(
      "plan_rule_steps",
      STEPS.map((step) => ({
        ...step,
        plan_rule_id: DEFAULT_RULE_ID,
        created_at: now,
        updated_at: now,
      }))
    );

    console.log("Default plan rule seeded.");
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("plan_rule_steps", {
      plan_rule_id: DEFAULT_RULE_ID,
    });
    await queryInterface.bulkDelete("plan_rules", {
      plan_rule_id: DEFAULT_RULE_ID,
    });
  },
};
