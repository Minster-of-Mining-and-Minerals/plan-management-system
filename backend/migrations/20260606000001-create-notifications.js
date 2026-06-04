"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notification_templates", {
      notification_template_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      template_code: {
        type: Sequelize.STRING(80),
        allowNull: false,
        unique: true,
      },
      category: {
        type: Sequelize.ENUM("plans", "assignments", "system", "logs"),
        allowNull: false,
      },
      notification_type: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      title_template: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      message_template: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      related_entity_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      default_link_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      icon_variant: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "bell",
      },
      priority: {
        type: Sequelize.ENUM("low", "normal", "high"),
        allowNull: false,
        defaultValue: "normal",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    });

    await queryInterface.createTable("notifications", {
      notification_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      recipient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      template_code: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      category: {
        type: Sequelize.ENUM("plans", "assignments", "system", "logs"),
        allowNull: false,
        defaultValue: "system",
      },
      notification_type: {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: "general",
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      related_entity_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      related_entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      link_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      icon_variant: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      priority: {
        type: Sequelize.ENUM("low", "normal", "high"),
        allowNull: false,
        defaultValue: "normal",
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    });

    await queryInterface.addIndex("notifications", {
      fields: ["recipient_id"],
      name: "notifications_recipient_id_idx",
    });

    await queryInterface.addIndex("notifications", {
      fields: ["recipient_id", "category"],
      name: "notifications_recipient_category_idx",
    });

    await queryInterface.addIndex("notifications", {
      fields: ["recipient_id", "is_read"],
      name: "notifications_recipient_read_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
    await queryInterface.dropTable("notification_templates");
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_notifications_category"`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_notifications_priority"`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_notification_templates_category"`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_notification_templates_priority"`);
  },
};
