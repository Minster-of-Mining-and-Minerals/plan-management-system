"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicationAdministration extends Model {
    static associate(models) {
      MedicationAdministration.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      MedicationAdministration.belongsTo(models.Prescription, {
        foreignKey: "prescription_id",
        as: "prescription",
      });
      MedicationAdministration.belongsTo(models.MedicationCatalog, {
        foreignKey: "medication_catalog_id",
        as: "medicationCatalog",
      });
      MedicationAdministration.belongsTo(models.User, {
        foreignKey: "administered_by",
        as: "administrator",
      });
    }
  }

  MedicationAdministration.init(
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
      prescription_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      medication_catalog_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      dose: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      route: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "Oral",
      },
      scheduled_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      administered_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "GIVEN", // GIVEN, MISSED, REFUSED, HELD
      },
      administered_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "MedicationAdministration",
      tableName: "medication_administrations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicationAdministration;
};
