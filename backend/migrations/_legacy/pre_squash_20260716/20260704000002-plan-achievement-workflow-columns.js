"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_nodes", "period_actual_status", {
      type: Sequelize.ENUM("empty", "submitted", "approved", "rejected"),
      allowNull: false,
      defaultValue: "empty",
    });

    await queryInterface.addColumn("plan_nodes", "period_actual_submitted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_nodes", "period_actual_submitted_by", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_nodes", "period_actual_approved_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_nodes", "period_actual_approved_by", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_nodes", "period_actual_rejection_comment", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE plan_nodes
      SET period_actual_status = 'approved'
      WHERE period_actual IS NOT NULL
    `);

    await queryInterface.addIndex("plan_nodes", ["period_actual_status"], {
      name: "idx_plan_nodes_period_actual_status",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "plan_nodes",
      "idx_plan_nodes_period_actual_status"
    );

    await queryInterface.removeColumn("plan_nodes", "period_actual_rejection_comment");
    await queryInterface.removeColumn("plan_nodes", "period_actual_approved_by");
    await queryInterface.removeColumn("plan_nodes", "period_actual_approved_at");
    await queryInterface.removeColumn("plan_nodes", "period_actual_submitted_by");
    await queryInterface.removeColumn("plan_nodes", "period_actual_submitted_at");
    await queryInterface.removeColumn("plan_nodes", "period_actual_status");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_nodes_period_actual_status";'
    );
  },
};
