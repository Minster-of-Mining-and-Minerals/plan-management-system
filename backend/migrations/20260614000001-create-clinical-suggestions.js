"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  dropTableIfExists,
  createTableIfNotExists,
  safeAddIndex,
} = require("./_helpers/migrationUtils");
const {
  DEFAULT_CLINICAL_PHRASES,
} = require("../config/clinicalSuggestionConstants");

/** Baseline 19 — Clinical Suggestions & User Usage */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await createTableIfNotExists(queryInterface, "clinical_suggestions", {
      suggestion_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      text: { type: Sequelize.TEXT, allowNull: false },
      category: { type: Sequelize.STRING(64), allowNull: false, defaultValue: "general" },
      department_id: { type: Sequelize.UUID, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true },
      frequency: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      organization_frequency: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_pinned: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      last_used_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await safeAddIndex(queryInterface, "clinical_suggestions", ["category"]);
    await safeAddIndex(queryInterface, "clinical_suggestions", ["department_id"]);
    await safeAddIndex(queryInterface, "clinical_suggestions", ["is_active"]);
    await safeAddIndex(queryInterface, "clinical_suggestions", ["organization_frequency"]);

    await createTableIfNotExists(queryInterface, "user_suggestion_usage", {
      usage_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      user_id: { type: Sequelize.UUID, allowNull: false },
      suggestion_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "clinical_suggestions", key: "suggestion_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      usage_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      last_used_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await safeAddIndex(queryInterface, "user_suggestion_usage", ["user_id", "suggestion_id"], {
      unique: true,
      name: "user_suggestion_usage_user_suggestion_unique",
    });

    const [existing] = await queryInterface.sequelize.query(
      `SELECT suggestion_id FROM clinical_suggestions LIMIT 1`
    );
    if (!existing.length) {
      await queryInterface.bulkInsert(
        "clinical_suggestions",
        DEFAULT_CLINICAL_PHRASES.map((p) => ({
          suggestion_id: uuidv4(),
          text: p.text,
          category: p.category,
          organization_frequency: 1,
          is_pinned: true,
          is_active: true,
          created_at: now,
          updated_at: now,
        }))
      );
    }
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "user_suggestion_usage");
    await dropTableIfExists(queryInterface, "clinical_suggestions");
  },
};
