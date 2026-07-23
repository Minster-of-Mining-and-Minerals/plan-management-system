"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  createTableIfNotExists,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await createTableIfNotExists(queryInterface, "diagnosis_records", {
      diagnosis_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
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
      assigned_staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      form_config_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "diagnosis_form_configs", key: "config_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      form_data: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      ...ts,
    });

    await safeAddIndex(
      queryInterface,
      "diagnosis_records",
      ["appointment_id"],
      { unique: true, name: "diagnosis_records_appointment_unique" }
    );

    await safeAddIndex(queryInterface, "diagnosis_records", ["patient_id"]);
    await safeAddIndex(queryInterface, "diagnosis_records", ["assigned_staff_id"]);
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "diagnosis_records");
  },
};
