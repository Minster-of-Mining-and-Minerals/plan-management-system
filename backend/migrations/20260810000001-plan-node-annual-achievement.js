"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_nodes", "achievement_mode", {
      type: Sequelize.ENUM("period", "annual"),
      allowNull: false,
      defaultValue: "period",
    });

    await queryInterface.addColumn("plan_nodes", "annual_actual", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_nodes", "annual_actual_status", {
      type: Sequelize.ENUM("empty", "submitted", "approved", "validated", "rejected"),
      allowNull: false,
      defaultValue: "empty",
    });

    await queryInterface.addColumn("plan_nodes", "annual_actual_submitted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_nodes", "annual_actual_submitted_by", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_nodes", "annual_actual_approved_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_nodes", "annual_actual_approved_by", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_nodes", "annual_actual_validated_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_nodes", "annual_actual_validated_by", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_nodes", "annual_actual_rejection_comment", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_nodes", "annual_actual_rejection_comment");
    await queryInterface.removeColumn("plan_nodes", "annual_actual_validated_by");
    await queryInterface.removeColumn("plan_nodes", "annual_actual_validated_at");
    await queryInterface.removeColumn("plan_nodes", "annual_actual_approved_by");
    await queryInterface.removeColumn("plan_nodes", "annual_actual_approved_at");
    await queryInterface.removeColumn("plan_nodes", "annual_actual_submitted_by");
    await queryInterface.removeColumn("plan_nodes", "annual_actual_submitted_at");
    await queryInterface.removeColumn("plan_nodes", "annual_actual_status");
    await queryInterface.removeColumn("plan_nodes", "annual_actual");
    await queryInterface.removeColumn("plan_nodes", "achievement_mode");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_nodes_achievement_mode";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_nodes_annual_actual_status";'
    );
  },
};
