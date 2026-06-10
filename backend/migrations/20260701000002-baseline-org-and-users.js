"use strict";

const {
  createTableIfNotExists,
  dropTablesInOrder,
} = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "government_structures", {
      government_structure_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      level: { type: Sequelize.INTEGER, defaultValue: 1, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await createTableIfNotExists(queryInterface, "internal_structures", {
      internal_structure_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "internal_structures", key: "internal_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      level: { type: Sequelize.INTEGER, defaultValue: 1, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await createTableIfNotExists(queryInterface, "users", {
      user_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      full_name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: false },
      phone_number: { type: Sequelize.STRING(50), allowNull: true, unique: true },
      profile_image: { type: Sequelize.STRING(255), allowNull: true },
      is_first_logged_in: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      password_changed_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      internal_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "internal_structures", key: "internal_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      otp: { type: Sequelize.STRING, allowNull: true },
      otp_expiry: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await createTableIfNotExists(queryInterface, "user_roles", {
      user_role_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "roles", key: "role_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assigned_by: { type: Sequelize.UUID, allowNull: true },
      assigned_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW"), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "user_permission_groups", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      permission_group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "permission_groups", key: "permission_group_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    });

    await createTableIfNotExists(queryInterface, "government_structure_permission_groups", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      permission_group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "permission_groups", key: "permission_group_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    });
  },

  async down(queryInterface) {
    await dropTablesInOrder(queryInterface, [
      "government_structure_permission_groups",
      "user_permission_groups",
      "user_roles",
      "users",
      "internal_structures",
      "government_structures",
    ]);
  },
};
