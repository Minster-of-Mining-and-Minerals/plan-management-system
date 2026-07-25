"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create medication_catalogs
    await queryInterface.createTable("medication_catalogs", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      generic_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      brand_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      medication_code: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      },
      dosage_form: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      strength: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      route: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      manufacturer: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      controlled_status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "UNCONTROLLED",
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      billing_service_id: {
        type: Sequelize.UUID,
        allowNull: true,
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

    // 2. Add medication_catalog_id to prescription_items
    const rxItemsTable = await queryInterface.describeTable("prescription_items");
    if (!rxItemsTable.medication_catalog_id) {
      await queryInterface.addColumn("prescription_items", "medication_catalog_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "medication_catalogs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    // 3. Create drug_interactions
    await queryInterface.createTable("drug_interactions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      medication_a_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      medication_b_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      severity: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "WARNING",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      clinical_action: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // 4. Create medication_safety_alerts
    await queryInterface.createTable("medication_safety_alerts", {
      alert_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      prescription_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      alert_type: {
        type: Sequelize.STRING(50),
        allowNull: false, // ALLERGY, INTERACTION, DUPLICATE_THERAPY, DOSE_SAFETY
      },
      severity: {
        type: Sequelize.STRING(30),
        allowNull: false, // INFO, WARNING, SEVERE, CONTRAINDICATED
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "OPEN", // OPEN, ACKNOWLEDGED, OVERRIDDEN, RESOLVED
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      resolved_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      resolution_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("medication_safety_alerts");
    await queryInterface.dropTable("drug_interactions");
    await queryInterface.removeColumn("prescription_items", "medication_catalog_id");
    await queryInterface.dropTable("medication_catalogs");
  },
};
