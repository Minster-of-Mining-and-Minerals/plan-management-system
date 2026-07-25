"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create medication_administrations (MAR)
    await queryInterface.createTable("medication_administrations", {
      id: {
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
        allowNull: false,
      },
      medication_catalog_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      dose: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      route: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: "Oral",
      },
      scheduled_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      administered_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "GIVEN", // GIVEN, MISSED, REFUSED, HELD
      },
      administered_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      reason: {
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

    // 2. Create medication_formulary_rules
    await queryInterface.createTable("medication_formulary_rules", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      medication_catalog_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      department_restriction: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      requires_approval: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      doctor_authorization_level: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      preferred_alternative_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      notes: {
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

    // 3. Create medication_reconciliations
    await queryInterface.createTable("medication_reconciliations", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      reconciliation_type: {
        type: Sequelize.STRING(50),
        allowNull: false, // ADMISSION, DISCHARGE
      },
      home_medications_json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      reconciled_medications_json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      conflict_summary_json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      reconciled_by: {
        type: Sequelize.UUID,
        allowNull: false,
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
    await queryInterface.dropTable("medication_reconciliations");
    await queryInterface.dropTable("medication_formulary_rules");
    await queryInterface.dropTable("medication_administrations");
  },
};
