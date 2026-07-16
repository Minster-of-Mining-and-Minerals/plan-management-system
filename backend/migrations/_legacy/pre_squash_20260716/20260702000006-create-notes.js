"use strict";

const { createTableIfNotExists } = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "notes", {
      note_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false, defaultValue: "" },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "draft",
      },
      is_pinned: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await createTableIfNotExists(queryInterface, "note_attachments", {
      note_attachment_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      note_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "notes", key: "note_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      attachment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "attachments", key: "attachment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS notes_status_idx ON notes (status);
      CREATE INDEX IF NOT EXISTS notes_is_pinned_idx ON notes (is_pinned);
      CREATE INDEX IF NOT EXISTS notes_is_archived_idx ON notes (is_archived);
      CREATE INDEX IF NOT EXISTS notes_created_by_idx ON notes (created_by);
      CREATE INDEX IF NOT EXISTS notes_deleted_at_idx ON notes (deleted_at);
      CREATE UNIQUE INDEX IF NOT EXISTS note_attachments_note_attachment_unique
        ON note_attachments (note_id, attachment_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("note_attachments");
    await queryInterface.dropTable("notes");
  },
};
