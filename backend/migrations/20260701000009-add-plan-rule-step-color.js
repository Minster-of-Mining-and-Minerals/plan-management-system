"use strict";

const { columnExists } = require("./helpers/schemaHelpers");

const DEFAULT_STEP_COLORS = ["#7C3AED", "#2563EB", "#059669", "#D97706"];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "plan_rule_steps";

    if (!(await columnExists(queryInterface, tableName, "color_hex"))) {
      await queryInterface.addColumn(tableName, "color_hex", {
        type: Sequelize.STRING(7),
        allowNull: true,
      });
    }

    for (let index = 0; index < DEFAULT_STEP_COLORS.length; index += 1) {
      await queryInterface.sequelize.query(
        `
        UPDATE plan_rule_steps
        SET color_hex = :color
        WHERE color_hex IS NULL
          AND step_order = :stepOrder
        `,
        {
          replacements: {
            color: DEFAULT_STEP_COLORS[index],
            stepOrder: index + 1,
          },
        }
      );
    }

    await queryInterface.sequelize.query(`
      UPDATE plan_rule_steps
      SET color_hex = '#6B7280'
      WHERE color_hex IS NULL
    `);
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, "plan_rule_steps", "color_hex")) {
      await queryInterface.removeColumn("plan_rule_steps", "color_hex");
    }
  },
};
