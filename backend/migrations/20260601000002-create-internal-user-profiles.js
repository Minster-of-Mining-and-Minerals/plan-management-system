"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("internal_user_profiles", {
      profile_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      department: { type: Sequelize.STRING(128), allowNull: true },
      job_title: { type: Sequelize.STRING(128), allowNull: true },
      employee_id: { type: Sequelize.STRING(64), allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
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
    });
    await queryInterface.addIndex("internal_user_profiles", ["user_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("internal_user_profiles");
  },
};
