"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NotificationTemplate extends Model {
    static associate(models) {
      NotificationTemplate.hasMany(models.Notification, {
        foreignKey: "template_code",
        sourceKey: "template_code",
        as: "notifications",
      });
    }
  }

  NotificationTemplate.init(
    {
      notification_template_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      template_code: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      category: {
        type: DataTypes.ENUM("plans", "assignments", "system", "logs"),
        allowNull: false,
      },
      notification_type: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      title_template: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message_template: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      related_entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      default_link_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      icon_variant: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "bell",
      },
      priority: {
        type: DataTypes.ENUM("low", "normal", "high"),
        allowNull: false,
        defaultValue: "normal",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "NotificationTemplate",
      tableName: "notification_templates",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return NotificationTemplate;
};
