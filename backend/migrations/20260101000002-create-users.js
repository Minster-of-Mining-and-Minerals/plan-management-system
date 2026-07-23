"use strict";

const {
  timestampColumns,
  softDeleteColumn,
  safeAddIndex,
  dropTableIfExists,
  dropEnumIfExists,
} = require("./_helpers/migrationUtils");

/**
 * Baseline 02 — Users with account_type from the start.
 * Replaces: 20260501000006, 20260601000001
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("users", {
      user_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      full_name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: false },
      phone_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      },
      profile_image: { type: Sequelize.STRING(255), allowNull: true },
      account_type: {
        type: Sequelize.ENUM("INTERNAL", "PATIENT"),
        allowNull: false,
        defaultValue: "INTERNAL",
      },
      token_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_first_logged_in: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      password_changed_at: { type: Sequelize.DATE, allowNull: true },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      otp: { type: Sequelize.STRING, allowNull: true },
      otp_expiry: { type: Sequelize.DATE, allowNull: true },
      ...ts,
      ...softDeleteColumn(Sequelize),
    });

    await safeAddIndex(queryInterface, "users", ["account_type"]);
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "users");
    await dropEnumIfExists(queryInterface, "enum_users_account_type");
  },
};
