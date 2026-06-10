"use strict";

const {
  createTableIfNotExists,
  dropTablesInOrder,
  dropIndexIfExists,
  dropEnumTypes,
} = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "notification_templates", {
      notification_template_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      template_code: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      category: {
        type: Sequelize.ENUM("plans", "assignments", "system", "logs"),
        allowNull: false,
      },
      notification_type: { type: Sequelize.STRING(80), allowNull: false },
      title_template: { type: Sequelize.STRING(255), allowNull: false },
      message_template: { type: Sequelize.TEXT, allowNull: false },
      related_entity_type: { type: Sequelize.STRING(50), allowNull: true },
      default_link_path: { type: Sequelize.STRING(500), allowNull: true },
      icon_variant: { type: Sequelize.STRING(50), allowNull: false, defaultValue: "bell" },
      priority: {
        type: Sequelize.ENUM("low", "normal", "high"),
        allowNull: false,
        defaultValue: "normal",
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "notifications", {
      notification_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      recipient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      template_code: { type: Sequelize.STRING(80), allowNull: true },
      category: {
        type: Sequelize.ENUM("plans", "assignments", "system", "logs"),
        allowNull: false,
        defaultValue: "system",
      },
      notification_type: { type: Sequelize.STRING(80), allowNull: false, defaultValue: "general" },
      title: { type: Sequelize.STRING(255), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      related_entity_type: { type: Sequelize.STRING(50), allowNull: true },
      related_entity_id: { type: Sequelize.UUID, allowNull: true },
      link_path: { type: Sequelize.STRING(500), allowNull: true },
      icon_variant: { type: Sequelize.STRING(50), allowNull: true },
      priority: {
        type: Sequelize.ENUM("low", "normal", "high"),
        allowNull: false,
        defaultValue: "normal",
      },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications (recipient_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_category ON notifications (recipient_id, category)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications (recipient_id, is_read)
    `);
  },

  async down(queryInterface) {
    await dropIndexIfExists(queryInterface, "notifications", "idx_notifications_recipient_read");
    await dropIndexIfExists(queryInterface, "notifications", "idx_notifications_recipient_category");
    await dropIndexIfExists(queryInterface, "notifications", "idx_notifications_recipient_id");

    await dropTablesInOrder(queryInterface, ["notifications", "notification_templates"]);

    await dropEnumTypes(queryInterface, [
      "enum_notifications_category",
      "enum_notifications_priority",
      "enum_notification_templates_category",
      "enum_notification_templates_priority",
    ]);
  },
};
