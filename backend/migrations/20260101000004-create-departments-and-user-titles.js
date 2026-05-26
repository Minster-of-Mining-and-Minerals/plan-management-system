"use strict";

const {
  timestampColumns,
  softDeleteColumn,
  safeAddIndex,
  dropTableIfExists,
  dropEnumIfExists,
} = require("./_helpers/migrationUtils");

/**
 * Baseline 04 — Organizational structure.
 * Replaces: 20260603000001, 20260604000001
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("departments", {
      department_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      slug: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      dept_head: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
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
      ...softDeleteColumn(Sequelize),
    });

    await safeAddIndex(queryInterface, "departments", ["status"]);
    await safeAddIndex(queryInterface, "departments", ["slug"]);

    await queryInterface.createTable("user_titles", {
      title_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
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
      ...softDeleteColumn(Sequelize),
    });

    await safeAddIndex(queryInterface, "user_titles", ["status"]);
    await safeAddIndex(queryInterface, "user_titles", ["code"]);
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "user_titles");
    await dropEnumIfExists(queryInterface, "enum_user_titles_status");
    await dropTableIfExists(queryInterface, "departments");
    await dropEnumIfExists(queryInterface, "enum_departments_status");
  },
};
