"use strict";

const { dropTableIfExists, createTableIfNotExists, safeAddIndex } = require("./_helpers/migrationUtils");

/** Baseline 18 — Medical Diagram Categories & Medical Diagrams */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "medical_diagram_categories", {
      category_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
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
      category_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "medical_diagram_categories",
          key: "category_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
      await safeAddIndex(queryInterface, "medical_diagrams", ["category_id"]);
    }
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "medical_diagrams");
    await dropTableIfExists(queryInterface, "medical_diagram_categories");
  },
};
