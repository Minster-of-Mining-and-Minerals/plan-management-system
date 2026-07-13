"use strict";

const { dropTableIfExists, createTableIfNotExists, safeAddIndex } = require("./_helpers/migrationUtils");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (await createTableIfNotExists(queryInterface, "medical_diagrams", {
      diagram_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      image_file: {
        type: Sequelize.STRING(512),
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
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
    })) {
      await safeAddIndex(queryInterface, "medical_diagrams", ["status"]);
      await safeAddIndex(queryInterface, "medical_diagrams", ["category"]);
    }
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "medical_diagrams");
  },
};
