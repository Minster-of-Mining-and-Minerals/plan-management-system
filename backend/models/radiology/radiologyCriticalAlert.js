"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyCriticalAlert extends Model {
    static associate(models) {
      RadiologyCriticalAlert.belongsTo(models.RadiologyStudy, {
        foreignKey: "study_id",
        as: "study",
      });
      RadiologyCriticalAlert.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      RadiologyCriticalAlert.belongsTo(models.User, {
        foreignKey: "recipient_doctor_id",
        as: "recipientDoctor",
      });
      RadiologyCriticalAlert.belongsTo(models.User, {
        foreignKey: "acknowledged_by",
        as: "acknowledgedByUser",
      });
    }
  }

  RadiologyCriticalAlert.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      study_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      severity: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "CRITICAL",
      },
      finding: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      recipient_doctor_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "OPEN", // OPEN, ACKNOWLEDGED, CLOSED
      },
      acknowledged_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      acknowledged_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyCriticalAlert",
      tableName: "radiology_critical_alerts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyCriticalAlert;
};
