"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. clinical_order_definitions
    await queryInterface.createTable("clinical_order_definitions", {
      definition_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      organization_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "DEFAULT_ORG",
      },
      code: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "DIAGNOSTIC",
      },
      department_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "GENERAL",
      },
      activity_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "ORDER",
      },
      workflow_definition_id: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      request_form_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      execution_form_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      result_form_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      billing_configuration_id: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      sla_configuration_id: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      priority_configuration: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { default_priority: "ROUTINE", allowed_priorities: ["ROUTINE", "URGENT", "STAT"] },
      },
      validation_rules_json: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      required_permissions_json: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "PUBLISHED", // DRAFT, PUBLISHED, ARCHIVED
      },
      version: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "1.0.0",
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

    // 2. Add generic payload and snapshot columns to clinical_orders
    const tableInfo = await queryInterface.describeTable("clinical_orders");
    if (!tableInfo.order_definition_id) {
      await queryInterface.addColumn("clinical_orders", "order_definition_id", {
        type: Sequelize.STRING(128),
        allowNull: true,
      });
    }
    if (!tableInfo.workflow_instance_id) {
      await queryInterface.addColumn("clinical_orders", "workflow_instance_id", {
        type: Sequelize.STRING(128),
        allowNull: true,
      });
    }
    if (!tableInfo.intent_payload_json) {
      await queryInterface.addColumn("clinical_orders", "intent_payload_json", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
    if (!tableInfo.execution_payload_json) {
      await queryInterface.addColumn("clinical_orders", "execution_payload_json", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
    if (!tableInfo.result_payload_json) {
      await queryInterface.addColumn("clinical_orders", "result_payload_json", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
    if (!tableInfo.configuration_snapshot_json) {
      await queryInterface.addColumn("clinical_orders", "configuration_snapshot_json", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("clinical_orders", "configuration_snapshot_json");
    await queryInterface.removeColumn("clinical_orders", "result_payload_json");
    await queryInterface.removeColumn("clinical_orders", "execution_payload_json");
    await queryInterface.removeColumn("clinical_orders", "intent_payload_json");
    await queryInterface.removeColumn("clinical_orders", "workflow_instance_id");
    await queryInterface.removeColumn("clinical_orders", "order_definition_id");
    await queryInterface.dropTable("clinical_order_definitions");
  },
};
