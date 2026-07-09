"use strict";

const RULE_ID = "60000000-0000-4000-8000-000000000002";

const RULE_NAME = "Weight Rollup Based 4-Level Plan";

const STEPS = [
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000021",
    step_order: 1,
    node_type: "strategic",
    label: "Strategic Focus Area",
    requires_weight: false,
    requires_contribution_weight: false,
    color_hex: "#7C3AED",
  },
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000022",
    step_order: 2,
    node_type: "goal",
    label: "Goal",
    requires_weight: true,
    requires_contribution_weight: true,
    color_hex: "#2563EB",
  },
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000023",
    step_order: 3,
    node_type: "kpi",
    label: "KPI / Indicator",
    requires_weight: true,
    requires_contribution_weight: false,
    color_hex: "#059669",
  },
  {
    plan_rule_step_id: "60000000-0000-4000-8000-000000000024",
    step_order: 4,
    node_type: "task",
    label: "Task / Activity",
    requires_weight: true,
    requires_contribution_weight: true,
    color_hex: "#D97706",
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const existing = await queryInterface.sequelize.query(
      `SELECT plan_rule_id FROM plan_rules
       WHERE plan_rule_id = :id OR name = :name
       LIMIT 1`,
      {
        replacements: { id: RULE_ID, name: RULE_NAME },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    const resolvedRuleId = existing[0]?.plan_rule_id ?? RULE_ID;

    if (existing.length === 0) {
      await queryInterface.bulkInsert("plan_rules", [
        {
          plan_rule_id: resolvedRuleId,
          name: RULE_NAME,
          government_structure_id: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    } else {
      await queryInterface.sequelize.query(
        `UPDATE plan_rules
         SET name = :name, is_active = true, updated_at = :now
         WHERE plan_rule_id = :id`,
        { replacements: { id: resolvedRuleId, name: RULE_NAME, now } }
      );
      await queryInterface.bulkDelete("plan_rule_steps", { plan_rule_id: resolvedRuleId });
    }

    await queryInterface.bulkInsert(
      "plan_rule_steps",
      STEPS.map((step) => ({
        ...step,
        plan_rule_id: resolvedRuleId,
        created_at: now,
        updated_at: now,
      }))
    );

    console.log(`Seeded plan rule "${RULE_NAME}" (${resolvedRuleId})`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("plan_rule_steps", { plan_rule_id: RULE_ID });
    await queryInterface.bulkDelete("plan_rules", { plan_rule_id: RULE_ID });
  },
};
