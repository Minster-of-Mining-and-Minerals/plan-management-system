"use strict";

async function columnExists(queryInterface, table, column) {
  const description = await queryInterface.describeTable(table);
  return Object.prototype.hasOwnProperty.call(description, column);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const hasStepWeightMode = await columnExists(queryInterface, "plan_rule_steps", "weight_mode");
    if (!hasStepWeightMode) {
      await queryInterface.addColumn("plan_rule_steps", "weight_mode", {
        type: Sequelize.ENUM("number", "percentage", "frequency"),
        allowNull: true,
      });
    }

    const hasRuleWeightMode = await columnExists(queryInterface, "plan_rules", "weight_mode");
    if (hasRuleWeightMode) {
      const dialect = queryInterface.sequelize.getDialect();

      if (dialect === "postgres") {
        await queryInterface.sequelize.query(`
          UPDATE plan_rule_steps prs
          SET weight_mode = pr.weight_mode::text::enum_plan_rule_steps_weight_mode
          FROM plan_rules pr
          WHERE prs.plan_rule_id = pr.plan_rule_id
            AND prs.requires_weight = true
            AND prs.weight_mode IS NULL
            AND prs.step_order = (
              SELECT MIN(s.step_order)
              FROM plan_rule_steps s
              WHERE s.plan_rule_id = pr.plan_rule_id
                AND s.requires_weight = true
            )
        `);
      } else {
        await queryInterface.sequelize.query(`
          UPDATE plan_rule_steps
          SET weight_mode = (
            SELECT pr.weight_mode
            FROM plan_rules pr
            WHERE pr.plan_rule_id = plan_rule_steps.plan_rule_id
          )
          WHERE requires_weight = 1
            AND weight_mode IS NULL
            AND step_order = (
              SELECT MIN(s.step_order)
              FROM plan_rule_steps s
              WHERE s.plan_rule_id = plan_rule_steps.plan_rule_id
                AND s.requires_weight = 1
            )
        `);
      }

      await queryInterface.removeColumn("plan_rules", "weight_mode");
    }
  },

  async down(queryInterface, Sequelize) {
    const hasRuleWeightMode = await columnExists(queryInterface, "plan_rules", "weight_mode");
    if (!hasRuleWeightMode) {
      await queryInterface.addColumn("plan_rules", "weight_mode", {
        type: Sequelize.ENUM("number", "percentage", "frequency"),
        allowNull: false,
        defaultValue: "percentage",
      });
    }

    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === "postgres") {
      await queryInterface.sequelize.query(`
        UPDATE plan_rules pr
        SET weight_mode = COALESCE(
          (
            SELECT s.weight_mode::text::enum_plan_rules_weight_mode
            FROM plan_rule_steps s
            WHERE s.plan_rule_id = pr.plan_rule_id
              AND s.weight_mode IS NOT NULL
            ORDER BY s.step_order ASC
            LIMIT 1
          ),
          'percentage'::enum_plan_rules_weight_mode
        )
      `);
    }

    const hasStepWeightMode = await columnExists(queryInterface, "plan_rule_steps", "weight_mode");
    if (hasStepWeightMode) {
      await queryInterface.removeColumn("plan_rule_steps", "weight_mode");
    }
  },
};
