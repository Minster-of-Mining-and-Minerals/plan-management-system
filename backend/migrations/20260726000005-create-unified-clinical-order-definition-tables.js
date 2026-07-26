"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const addCol = async (tableName, colName, colSpec) => {
      try {
        const info = await queryInterface.describeTable(tableName);
        if (!info[colName]) {
          await queryInterface.addColumn(tableName, colName, colSpec);
        }
      } catch (err) {
        // Table might not exist or column already exists
      }
    };

    // Ensure diagnosis_form_configs columns exist
    await addCol("diagnosis_form_configs", "source_template_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await addCol("diagnosis_form_configs", "assigned_staff_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await addCol("diagnosis_form_configs", "tenant_id", {
      type: Sequelize.STRING(64),
      allowNull: true,
      defaultValue: "DEFAULT_HOSPITAL",
    });
    await addCol("diagnosis_form_configs", "facility_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    // Extend clinical_order_definitions for complete composite structure
    await addCol("clinical_order_definitions", "verification_form_config_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await addCol("clinical_order_definitions", "queue_config_json", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });
    await addCol("clinical_order_definitions", "sla_config_json", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });
    await addCol("clinical_order_definitions", "billing_configuration", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: { is_billable: false },
    });
    await addCol("clinical_order_definitions", "automation_rules_json", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });
    await addCol("clinical_order_definitions", "decision_support_rules_json", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("clinical_order_definitions", "decision_support_rules_json");
    await queryInterface.removeColumn("clinical_order_definitions", "automation_rules_json");
    await queryInterface.removeColumn("clinical_order_definitions", "billing_configuration");
    await queryInterface.removeColumn("clinical_order_definitions", "sla_config_json");
    await queryInterface.removeColumn("clinical_order_definitions", "queue_config_json");
    await queryInterface.removeColumn("clinical_order_definitions", "verification_form_config_id");
  },
};
