"use strict";

const {
  timestampColumns,
  createTableIfNotExists,
  dropTableIfExists,
  safeAddIndex,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await createTableIfNotExists(queryInterface, "diagnosis_templates", {
      template_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
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

    await safeAddIndex(queryInterface, "diagnosis_templates", ["status"]);

    await createTableIfNotExists(queryInterface, "diagnosis_form_configs", {
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
      source_template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "diagnosis_templates", key: "template_id" },
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
      ...ts,
    });

    await safeAddIndex(
      queryInterface,
      "diagnosis_form_configs",
      ["assigned_staff_id", "is_active"]
    );
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "diagnosis_form_configs");
    await dropTableIfExists(queryInterface, "diagnosis_templates");
  },
};
