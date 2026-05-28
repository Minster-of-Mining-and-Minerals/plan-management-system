"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
 // here these are realtionships so when you create these models uncomment the below

 
    //   this.belongsTo(models.InternalUser, {
    //     foreignKey: "recipient_id",
    //     constraints: false,
    //     as: "internalRecipient",
    //   });

    //   this.belongsTo(models.ExternalUser, {
    //     foreignKey: "recipient_id",
    //     constraints: false,
    //     as: "externalRecipient",
    //   });

    
      
    //   this.belongsTo(models.Issue, {
    //     foreignKey: "related_entity_id",
    //     constraints: false,
    //     as: "issue",
    //   });

    //   this.belongsTo(models.Project, {
    //     foreignKey: "related_entity_id",
    //     constraints: false,
    //     as: "project",
    //   });
    }
  }

  Notification.init(
    {
      notification_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      recipient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      recipient_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [["internal", "external"]],
        },
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "system",
        validate: {
          isIn: [["system", "logs", "appointments"]],
        },
      },
      related_entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      related_entity_id: {
        type: DataTypes.UUID,
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