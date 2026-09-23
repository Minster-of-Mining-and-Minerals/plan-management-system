"use strict";

const DEFAULT_PLANNING_CONFIG_ID = "90000000-0000-4000-8000-000000000001";

const DEFAULT_TARGET_UNITS = [
  { id: "person", label: "Person", symbol: "persons" },
  { id: "km", label: "Kilometer", symbol: "km" },
  { id: "birr", label: "Birr", symbol: "ETB" },
  { id: "ton", label: "Ton", symbol: "t" },
  { id: "unit", label: "Unit", symbol: "units" },
];

const {
  createTableIfNotExists,
  tableExists,
  dropTablesInOrder,
  dropEnumTypes,
} = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "planning_configurations", {
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
      min_duration_years: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      max_duration_years: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
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
        defaultValue: "Start Date",
      },
      end_year_label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "End Date",
      },
      target_units: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: DEFAULT_TARGET_UNITS,
      },
      breakdown_mode: {
        type: Sequelize.ENUM("quarterly", "semi_annual", "custom"),
        allowNull: false,
        defaultValue: "quarterly",
      },
      custom_periods: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
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

    if (await tableExists(queryInterface, "planning_configurations")) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT planning_configuration_id FROM planning_configurations WHERE planning_configuration_id = :id LIMIT 1`,
        {
          replacements: { id: DEFAULT_PLANNING_CONFIG_ID },
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      if (!existing) {
        const now = new Date();
        await queryInterface.bulkInsert("planning_configurations", [
          {
            planning_configuration_id: DEFAULT_PLANNING_CONFIG_ID,
            government_structure_id: null,
            min_duration_years: 1,
            max_duration_years: 10,
            draft_entity_label_singular: "Plan Draft",
            draft_entity_label_plural: "Plan Drafts",
            create_action_label: "Create Plan Draft",
            planning_period_label: "Planning Period",
            duration_label: "Duration",
            start_year_label: "Start Date",
            end_year_label: "End Date",
            target_units: JSON.stringify(DEFAULT_TARGET_UNITS),
            breakdown_mode: "quarterly",
            custom_periods: JSON.stringify([]),
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    await dropTablesInOrder(queryInterface, ["planning_configurations"]);
    await dropEnumTypes(queryInterface, ["enum_planning_configurations_breakdown_mode"]);
  },
};
