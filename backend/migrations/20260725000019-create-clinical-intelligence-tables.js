"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. clinical_problems table
    await queryInterface.createTable("clinical_problems", {
      problem_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      problem_code: {
        type: Sequelize.STRING(50),
        allowNull: true, // ICD-10 or internal code
      },
      problem_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "ACTIVE", // ACTIVE, RESOLVED, CHRONIC, SUSPECTED
      },
      severity: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "MEDIUM", // LOW, MEDIUM, HIGH, CRITICAL
      },
      onset_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      resolved_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      encounter_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
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

    // 2. clinical_alerts table
    await queryInterface.createTable("clinical_alerts", {
      alert_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      alert_type: {
        type: Sequelize.STRING(80),
        allowNull: false, // DRUG_ALLERGY, DRUG_INTERACTION, ABNORMAL_LAB, RISK_FLAG, FOLLOW_UP, RECOMMENDATION
      },
      domain: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "GENERAL", // PHARMACY, LABORATORY, RADIOLOGY, GENERAL
      },
      severity: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "WARNING", // INFO, WARNING, CRITICAL
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      recommendation: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "OPEN", // OPEN, ACKNOWLEDGED, ACTION_TAKEN, DISMISSED
      },
      acknowledged_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      acknowledged_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      action_taken_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      action_taken_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      dismissed_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      dismissed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      source_rule_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      source_entity_type: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      source_entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      metadata_json: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      created_by: {
        type: Sequelize.UUID,
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("clinical_alerts");
    await queryInterface.dropTable("clinical_problems");
  },
};
