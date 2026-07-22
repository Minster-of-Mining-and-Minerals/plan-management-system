"use strict";

const {
  createTableIfNotExists,
  dropTableIfExists,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create the primary follow-ups table (without linked_schedule_id)
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

    // Create the encounter follow-up attempts junction table
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
      status: {
        type: Sequelize.ENUM("SCHEDULED", "MISSED", "CANCELLED", "ATTENDED"),
        allowNull: false,
        defaultValue: "SCHEDULED",
      },
      scheduled_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      cancel_reason: {
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

    // Add indexes for the follow-ups table
    await queryInterface.addIndex("encounter_follow_ups", ["patient_id"]);
    await queryInterface.addIndex("encounter_follow_ups", ["appointment_id"]);
    await queryInterface.addIndex("encounter_follow_ups", ["status"]);
    await queryInterface.addIndex("encounter_follow_ups", ["recommended_by"]);
    await queryInterface.addIndex("encounter_follow_ups", ["assigned_user_id"]);
    await queryInterface.addIndex("encounter_follow_ups", ["assigned_department_id"]);

    // Add indexes for the attempts table
    await queryInterface.addIndex("encounter_follow_up_attempts", ["follow_up_id"]);
    await queryInterface.addIndex("encounter_follow_up_attempts", ["schedule_id"]);
    await queryInterface.addIndex("encounter_follow_up_attempts", ["status"]);
    await queryInterface.addIndex("encounter_follow_up_attempts", ["scheduled_by"]);
  },

  async down(queryInterface, Sequelize) {
    await dropTableIfExists(queryInterface, "encounter_follow_up_attempts");
    await dropTableIfExists(queryInterface, "encounter_follow_ups");

    // Drop ENUM types
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_encounter_follow_up_attempts_status"'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_encounter_follow_ups_priority"'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_encounter_follow_ups_status"'
    );
  },
};