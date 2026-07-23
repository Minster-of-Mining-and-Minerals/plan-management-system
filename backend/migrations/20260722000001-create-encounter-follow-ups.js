"use strict";

const {
  createTableIfNotExists,
  dropTableIfExists,
  safeAddIndex,
  dropEnumIfExists,
} = require("./_helpers/migrationUtils");

/** Baseline 22 — Encounter Follow-Ups Ecosystem (Follow-Ups, Attempts, Outcomes) */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. encounter_follow_ups
    await createTableIfNotExists(queryInterface, "encounter_follow_ups", {
      follow_up_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      appointment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      recommended_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assigned_department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "departments", key: "department_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      assigned_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      clinical_instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      priority: {
        type: Sequelize.ENUM("LOW", "NORMAL", "HIGH", "URGENT"),
        allowNull: false,
        defaultValue: "NORMAL",
      },
      recommended_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      target_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          "RECOMMENDED",
          "PENDING_SCHEDULING",
          "SCHEDULED",
          "COMPLETED",
          "CANCELLED",
          "EXPIRED",
          "MISSED"
        ),
        allowNull: false,
        defaultValue: "RECOMMENDED",
      },
      completion_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      completed_encounter_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      parent_follow_up_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "encounter_follow_ups", key: "follow_up_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      cancel_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await safeAddIndex(queryInterface, "encounter_follow_ups", ["patient_id"], { name: "idx_encounter_follow_ups_patient_id" });
    await safeAddIndex(queryInterface, "encounter_follow_ups", ["appointment_id"], { name: "idx_encounter_follow_ups_appointment_id" });
    await safeAddIndex(queryInterface, "encounter_follow_ups", ["status"], { name: "idx_encounter_follow_ups_status" });
    await safeAddIndex(queryInterface, "encounter_follow_ups", ["recommended_by"], { name: "idx_encounter_follow_ups_recommended_by" });
    await safeAddIndex(queryInterface, "encounter_follow_ups", ["assigned_user_id"], { name: "idx_encounter_follow_ups_assigned_user_id" });
    await safeAddIndex(queryInterface, "encounter_follow_ups", ["assigned_department_id"], { name: "idx_encounter_follow_ups_assigned_department_id" });
    await safeAddIndex(queryInterface, "encounter_follow_ups", ["completed_encounter_id"], { name: "idx_encounter_follow_ups_completed_encounter_id" });
    await safeAddIndex(queryInterface, "encounter_follow_ups", ["patient_id", "status"], { name: "idx_encounter_follow_ups_patient_status" });
    await safeAddIndex(queryInterface, "encounter_follow_ups", ["parent_follow_up_id"], { name: "idx_encounter_follow_ups_parent_follow_up_id" });

    // 2. encounter_follow_up_attempts
    await createTableIfNotExists(queryInterface, "encounter_follow_up_attempts", {
      attempt_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      follow_up_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "encounter_follow_ups", key: "follow_up_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      schedule_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "patient_schedules", key: "schedule_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      attempt_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      status: {
        type: Sequelize.ENUM("SCHEDULED", "MISSED", "CANCELLED", "ATTENDED"),
        allowNull: false,
        defaultValue: "SCHEDULED",
      },
      scheduled_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      attended_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancel_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      missed_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      scheduled_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await safeAddIndex(queryInterface, "encounter_follow_up_attempts", ["follow_up_id"], { name: "idx_attempts_follow_up_id" });
    await safeAddIndex(queryInterface, "encounter_follow_up_attempts", ["schedule_id"], { name: "idx_attempts_schedule_id" });
    await safeAddIndex(queryInterface, "encounter_follow_up_attempts", ["status"], { name: "idx_attempts_status" });
    await safeAddIndex(queryInterface, "encounter_follow_up_attempts", ["scheduled_by"], { name: "idx_attempts_scheduled_by" });
    await safeAddIndex(queryInterface, "encounter_follow_up_attempts", ["attempt_number"], { name: "idx_attempts_attempt_number" });
    await safeAddIndex(queryInterface, "encounter_follow_up_attempts", ["created_by"], { name: "idx_attempts_created_by" });
    await safeAddIndex(queryInterface, "encounter_follow_up_attempts", ["updated_by"], { name: "idx_attempts_updated_by" });

    // 3. encounter_follow_up_outcomes
    await createTableIfNotExists(queryInterface, "encounter_follow_up_outcomes", {
      follow_up_outcome_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      follow_up_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "encounter_follow_ups", key: "follow_up_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      encounter_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      outcome_status: {
        type: Sequelize.ENUM(
          "RESOLVED",
          "IMPROVED",
          "STABLE",
          "WORSENED",
          "REFERRED",
          "LOST_TO_FOLLOW_UP",
          "PATIENT_DECLINED",
          "OTHER"
        ),
        allowNull: false,
      },
      treatment_response: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resolution_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      requires_additional_follow_up: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      recorded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await safeAddIndex(queryInterface, "encounter_follow_up_outcomes", ["follow_up_id"], {
      name: "idx_outcomes_follow_up_id",
      unique: true,
    });
    await safeAddIndex(queryInterface, "encounter_follow_up_outcomes", ["encounter_id"], {
      name: "idx_outcomes_encounter_id",
    });
    await safeAddIndex(queryInterface, "encounter_follow_up_outcomes", ["outcome_status"], {
      name: "idx_outcomes_outcome_status",
    });
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "encounter_follow_up_outcomes");
    await dropTableIfExists(queryInterface, "encounter_follow_up_attempts");
    await dropTableIfExists(queryInterface, "encounter_follow_ups");

    await dropEnumIfExists(queryInterface, "enum_encounter_follow_up_outcomes_outcome_status");
    await dropEnumIfExists(queryInterface, "enum_encounter_follow_up_attempts_status");
    await dropEnumIfExists(queryInterface, "enum_encounter_follow_ups_priority");
    await dropEnumIfExists(queryInterface, "enum_encounter_follow_ups_status");
  },
};