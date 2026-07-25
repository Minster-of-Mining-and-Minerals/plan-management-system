"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. clinical_predictions
    await queryInterface.createTable("clinical_predictions", {
      prediction_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      prediction_type: {
        type: Sequelize.STRING(64),
        allowNull: false, // QUEUE_OVERLOAD, SLA_BREACH, CONGESTION_RISK, RESOURCE_SHORTAGE, WORKLOAD_IMBALANCE
      },
      domain: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "OPERATIONS",
      },
      department: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "HOSPITAL",
      },
      risk_level: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "MEDIUM", // LOW, MEDIUM, HIGH, CRITICAL
      },
      probability: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      expected_time: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      reason: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      confidence: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 85.0,
      },
      actual_outcome: {
        type: Sequelize.STRING(64),
        allowNull: true, // OCCURRED, PREVENTED, FALSE_POSITIVE
      },
      accuracy: {
        type: Sequelize.FLOAT,
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

    // 2. prediction_models
    await queryInterface.createTable("prediction_models", {
      model_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      model_name: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      model_version: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "1.0.0",
      },
      prediction_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      accuracy_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 92.5,
      },
      training_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      active_status: {
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

    // 3. operational_risk_scores
    await queryInterface.createTable("operational_risk_scores", {
      score_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      domain: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "HOSPITAL",
      },
      department: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "HOSPITAL",
      },
      risk_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      risk_level: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "LOW",
      },
      factors: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      calculated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
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
    await queryInterface.dropTable("operational_risk_scores");
    await queryInterface.dropTable("prediction_models");
    await queryInterface.dropTable("clinical_predictions");
  },
};
