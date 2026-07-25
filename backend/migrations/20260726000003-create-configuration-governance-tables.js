"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. clinical_configuration_governance_logs
    await queryInterface.createTable("clinical_configuration_governance_logs", {
      governance_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "DEFAULT_HOSPITAL",
      },
      entity_type: {
        type: Sequelize.STRING(64),
        allowNull: false, // ORDER_DEFINITION, ACTIVITY_DEFINITION, WORKFLOW_DEFINITION, FORM_CONFIG
      },
      entity_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      entity_code: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      version: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "1.0.0",
      },
      previous_status: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      new_status: {
        type: Sequelize.STRING(32),
        allowNull: false, // DRAFT, VALIDATION_PENDING, VALIDATED, PUBLISHED, DEPRECATED
      },
      validation_summary_json: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      impact_analysis_json: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      actor_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // 2. Add tenant_id to clinical_activity_definitions
    const activityInfo = await queryInterface.describeTable("clinical_activity_definitions");
    if (!activityInfo.tenant_id) {
      await queryInterface.addColumn("clinical_activity_definitions", "tenant_id", {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "DEFAULT_HOSPITAL",
      });
    }

    // 3. Add tenant_id to clinical_workflow_definitions
    const workflowInfo = await queryInterface.describeTable("clinical_workflow_definitions");
    if (!workflowInfo.tenant_id) {
      await queryInterface.addColumn("clinical_workflow_definitions", "tenant_id", {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "DEFAULT_HOSPITAL",
      });
    }

    // 4. Add tenant_id to clinical_order_definitions
    const defInfo = await queryInterface.describeTable("clinical_order_definitions");
    if (!defInfo.tenant_id) {
      await queryInterface.addColumn("clinical_order_definitions", "tenant_id", {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "DEFAULT_HOSPITAL",
      });
    }

    // 5. Add tenant_id to clinical_orders
    const orderInfo = await queryInterface.describeTable("clinical_orders");
    if (!orderInfo.tenant_id) {
      await queryInterface.addColumn("clinical_orders", "tenant_id", {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "DEFAULT_HOSPITAL",
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("clinical_orders", "tenant_id");
    await queryInterface.removeColumn("clinical_order_definitions", "tenant_id");
    await queryInterface.removeColumn("clinical_workflow_definitions", "tenant_id");
    await queryInterface.removeColumn("clinical_activity_definitions", "tenant_id");
    await queryInterface.dropTable("clinical_configuration_governance_logs");
  },
};
