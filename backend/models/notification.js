"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, {
        foreignKey: "recipient_id",
        as: "recipient",
      });

      Notification.belongsTo(models.NotificationTemplate, {
        foreignKey: "template_code",
        targetKey: "template_code",
        as: "template",
      });
    }
  }

  Notification.init(
    {
      notification_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      recipient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      template_code: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      category: {
        type: DataTypes.ENUM("plans", "assignments", "system", "logs", "issues", "documents"),
        allowNull: false,
        defaultValue: "system",
      },
      notification_type: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: "general",
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      related_entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      related_entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      link_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      icon_variant: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      priority: {
        type: DataTypes.ENUM("low", "normal", "high"),
        allowNull: false,
        defaultValue: "normal",
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Notification",
      tableName: "notifications",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Notification;
};
