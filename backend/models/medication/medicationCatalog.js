"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicationCatalog extends Model {
    static associate(models) {
      MedicationCatalog.hasMany(models.PrescriptionItem, {
        foreignKey: "medication_catalog_id",
        as: "prescriptionItems",
      });
    }
  }

  MedicationCatalog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      generic_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      brand_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      medication_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },
      dosage_form: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      strength: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      route: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      manufacturer: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      controlled_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "UNCONTROLLED",
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      billing_service_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "MedicationCatalog",
      tableName: "medication_catalogs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicationCatalog;
};
