"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("diagnosis_form_configs", {
      config_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      assigned_staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: "Diagnosis Form",
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
      ...ts,
    });

    await safeAddIndex(
      queryInterface,
      "diagnosis_form_configs",
      ["assigned_staff_id", "is_active"]
    );

    await queryInterface.addColumn("form_field_groups", "diagnosis_config_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "diagnosis_form_configs", key: "config_id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.addColumn("form_fields", "diagnosis_config_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "diagnosis_form_configs", key: "config_id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.removeIndex(
      "form_fields",
      "form_fields_model_name_field_key_unique"
    ).catch(() => {});

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS form_fields_patient_field_key_unique
      ON form_fields (model_name, field_key)
      WHERE diagnosis_config_id IS NULL;
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS form_fields_diagnosis_field_key_unique
      ON form_fields (model_name, field_key, diagnosis_config_id)
      WHERE diagnosis_config_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE form_fields
      ALTER COLUMN field_type TYPE VARCHAR(32)
      USING field_type::text;
    `);

    await queryInterface.createTable("diagnosis_records", {
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

    const permissions = [
      { resource: "diagnosis_forms", action: "create" },
      { resource: "diagnosis_forms", action: "read" },
      { resource: "diagnosis_forms", action: "update" },
      { resource: "diagnosis_forms", action: "delete" },
    ];

    const now = new Date();
    for (const p of permissions) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = :resource AND action = :action LIMIT 1`,
        { replacements: p }
      );
      if (!rows.length) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: p.resource,
            action: p.action,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await dropTableIfExists(queryInterface, "diagnosis_records");
    await queryInterface.removeColumn("form_fields", "diagnosis_config_id");
    await queryInterface.removeColumn("form_field_groups", "diagnosis_config_id");
    await dropTableIfExists(queryInterface, "diagnosis_form_configs");
    await queryInterface.sequelize.query(
      `DELETE FROM permissions WHERE resource = 'diagnosis_forms'`
    );
  },
};
