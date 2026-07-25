"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ControlledMedicationLog extends Model {
    static associate(models) {
      ControlledMedicationLog.belongsTo(models.MedicationBatch, {
        foreignKey: "medication_batch_id",
        as: "batch",
      });
      ControlledMedicationLog.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      ControlledMedicationLog.belongsTo(models.Prescription, {
        foreignKey: "prescription_id",
        as: "prescription",
      });
      ControlledMedicationLog.belongsTo(models.User, {
        foreignKey: "dispensed_by",
        as: "dispenser",
      });
      ControlledMedicationLog.belongsTo(models.User, {
        foreignKey: "verified_by",
        as: "verifier",
      });
    }
  }

  ControlledMedicationLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      medication_batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      prescription_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dispensed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      verified_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      digital_signature: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ControlledMedicationLog",
      tableName: "controlled_medication_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ControlledMedicationLog;
};
