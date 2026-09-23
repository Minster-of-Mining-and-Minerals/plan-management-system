"use strict";

const DEFAULT_ID = "90000000-0000-4000-8000-000000000001";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("planning_configurations", {
      planning_configuration_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      min_duration_years: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      max_duration_years: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      draft_entity_label_singular: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "Plan Draft",
      },
      draft_entity_label_plural: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "Plan Drafts",
      },
      create_action_label: {
        type: Sequelize.STRING(120),
        allowNull: false,
        defaultValue: "Create Plan Draft",
      },
      planning_period_label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "Planning Period",
      },
      duration_label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "Duration",
      },
      start_year_label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "Start Year",
      },
      end_year_label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "End Year",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    const now = new Date();
    await queryInterface.bulkInsert("planning_configurations", [
      {
        planning_configuration_id: DEFAULT_ID,
        government_structure_id: null,
        min_duration_years: 1,
        max_duration_years: 10,
        draft_entity_label_singular: "Plan Draft",
        draft_entity_label_plural: "Plan Drafts",
        create_action_label: "Create Plan Draft",
        planning_period_label: "Planning Period",
        duration_label: "Duration",
        start_year_label: "Start Year",
        end_year_label: "End Year",
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("planning_configurations");
  },
};
