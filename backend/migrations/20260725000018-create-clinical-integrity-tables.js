"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. clinical_audit_events table
    await queryInterface.createTable("clinical_audit_events", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      event_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      domain: {
        type: Sequelize.STRING(50),
        allowNull: false, // LABORATORY, RADIOLOGY, PHARMACY, GENERAL
      },
      entity_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      actor_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      actor_role: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      previous_value_json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      new_value_json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      metadata_json: {
        type: Sequelize.JSONB,
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

    // 2. clinical_record_versions table
    await queryInterface.createTable("clinical_record_versions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      entity_type: {
        type: Sequelize.STRING(100),
        allowNull: false, // Prescription, LabResult, RadiologyReport, PharmacyDispense
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      version_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      snapshot_json: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      change_reason: {
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

    // 3. clinical_amendments table
    await queryInterface.createTable("clinical_amendments", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      entity_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      requested_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      reviewed_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "REQUESTED", // REQUESTED, UNDER_REVIEW, APPROVED, REJECTED
      },
      original_content_json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      proposed_content_json: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      clinical_reason: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      review_notes: {
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("clinical_amendments");
    await queryInterface.dropTable("clinical_record_versions");
    await queryInterface.dropTable("clinical_audit_events");
  },
};
