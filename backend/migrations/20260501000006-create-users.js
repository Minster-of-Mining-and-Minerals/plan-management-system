"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      user_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      full_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      phone_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      },
      profile_image: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      is_first_logged_in: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      password_changed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "structures",
          key: "structure_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      otp: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      otp_expiry: {
        type: Sequelize.DATE,
        allowNull: true,
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};
