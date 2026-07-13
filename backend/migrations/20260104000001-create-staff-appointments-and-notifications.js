"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("notifications", {
      notification_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      recipient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      recipient_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "internal",
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      related_entity_type: { type: Sequelize.STRING(50), allowNull: true },
      related_entity_id: { type: Sequelize.UUID, allowNull: true },
      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      category: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "system",
      },
      ...ts,
    });

    await safeAddIndex(
      queryInterface,
      "notifications",
      ["recipient_id", "category", "is_read"],
      { name: "notifications_recipient_category_read_idx" }
    );

    await queryInterface.createTable("staff_appointments", {
      appointment_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      schedule_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "patient_schedules", key: "schedule_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assigned_staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      admitted_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      admitted_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "admitted",
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      ...ts,
    });

    await safeAddIndex(
      queryInterface,
      "staff_appointments",
      ["assigned_staff_id", "status"],
      { name: "staff_appointments_staff_status_idx" }
    );
    await safeAddIndex(queryInterface, "staff_appointments", ["patient_id"], {
      name: "staff_appointments_patient_idx",
    });
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "staff_appointments");
    await dropTableIfExists(queryInterface, "notifications");
  },
};
