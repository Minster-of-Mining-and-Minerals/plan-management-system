"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. clinical_activity_definitions
    await queryInterface.createTable("clinical_activity_definitions", {
      activity_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      category: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "DIAGNOSTIC", // DIAGNOSTIC, THERAPEUTIC, CONSULTATION, PRESCRIPTION
      },
      department_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "GENERAL",
      },
      activity_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "ORDER", // ORDER, FORM_ENTRY, WORKFLOW_STEP
      },
      form_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      creates_clinical_order: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      order_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "LABORATORY", // LABORATORY, RADIOLOGY, PHARMACY, PHYSIOTHERAPY, CARDIOLOGY, OPHTHALMOLOGY, GENERAL
      },
      default_priority: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "ROUTINE",
      },
      sla_configuration: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { target_minutes: 60, warning_threshold_minutes: 45 },
      },
      billing_configuration: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { is_billable: true, default_fee: 0 },
      },
      execution_form_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      result_form_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 2. clinical_workflow_definitions
    await queryInterface.createTable("clinical_workflow_definitions", {
      workflow_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      department_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "GENERAL",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      steps: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 3. Add activity metadata columns to clinical_orders
    const tableInfo = await queryInterface.describeTable("clinical_orders");
    if (!tableInfo.activity_definition_id) {
      await queryInterface.addColumn("clinical_orders", "activity_definition_id", {
        type: Sequelize.STRING(128),
        allowNull: true,
      });
    }
    if (!tableInfo.source_form_config_id) {
      await queryInterface.addColumn("clinical_orders", "source_form_config_id", {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }
    if (!tableInfo.clinical_intent_json) {
      await queryInterface.addColumn("clinical_orders", "clinical_intent_json", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
    if (!tableInfo.execution_form_config_id) {
      await queryInterface.addColumn("clinical_orders", "execution_form_config_id", {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }
    if (!tableInfo.result_form_config_id) {
      await queryInterface.addColumn("clinical_orders", "result_form_config_id", {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("clinical_orders", "result_form_config_id");
    await queryInterface.removeColumn("clinical_orders", "execution_form_config_id");
    await queryInterface.removeColumn("clinical_orders", "clinical_intent_json");
    await queryInterface.removeColumn("clinical_orders", "source_form_config_id");
    await queryInterface.removeColumn("clinical_orders", "activity_definition_id");
    await queryInterface.dropTable("clinical_workflow_definitions");
    await queryInterface.dropTable("clinical_activity_definitions");
  },
};
