"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicationReconciliation extends Model {
    static associate(models) {
      MedicationReconciliation.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      MedicationReconciliation.belongsTo(models.User, {
        foreignKey: "reconciled_by",
        as: "reconciler",
      });
    }
  }

  MedicationReconciliation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reconciliation_type: {
        type: DataTypes.STRING(50),
        allowNull: false, // ADMISSION, DISCHARGE
      },
      home_medications_json: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      reconciled_medications_json: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      conflict_summary_json: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      reconciled_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "MedicationReconciliation",
      tableName: "medication_reconciliations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicationReconciliation;
};
