"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicationSafetyAlert extends Model {
    static associate(models) {
      MedicationSafetyAlert.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      MedicationSafetyAlert.belongsTo(models.Prescription, {
        foreignKey: "prescription_id",
        as: "prescription",
      });
      MedicationSafetyAlert.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      MedicationSafetyAlert.belongsTo(models.User, {
        foreignKey: "resolved_by",
        as: "resolver",
      });
    }
  }

  MedicationSafetyAlert.init(
    {
      alert_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      prescription_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      alert_type: {
        type: DataTypes.STRING(50),
        allowNull: false, // ALLERGY, INTERACTION, DUPLICATE_THERAPY, DOSE_SAFETY
      },
      severity: {
        type: DataTypes.STRING(30),
        allowNull: false, // INFO, WARNING, SEVERE, CONTRAINDICATED
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "OPEN", // OPEN, ACKNOWLEDGED, OVERRIDDEN, RESOLVED
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      resolved_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      resolution_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "MedicationSafetyAlert",
      tableName: "medication_safety_alerts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicationSafetyAlert;
};
