"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrescriptionItem extends Model {
    static associate(models) {
      PrescriptionItem.belongsTo(models.Prescription, {
        foreignKey: "prescription_id",
        as: "prescription",
      });
      if (models.MedicationCatalog) {
        PrescriptionItem.belongsTo(models.MedicationCatalog, {
          foreignKey: "medication_catalog_id",
          as: "medicationCatalog",
        });
      }
    }
  }

  PrescriptionItem.init(
    {
      prescription_item_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      prescription_id: { type: DataTypes.UUID, allowNull: false },
      medication_catalog_id: { type: DataTypes.UUID, allowNull: true },
      item_name: { type: DataTypes.STRING(255), allowNull: false },
      strength: { type: DataTypes.STRING(120), allowNull: true },
      route: { type: DataTypes.STRING(120), allowNull: true },
      dosage: { type: DataTypes.STRING(120), allowNull: true },
      frequency: { type: DataTypes.STRING(120), allowNull: true },
      duration: { type: DataTypes.STRING(120), allowNull: true },
      instructions: { type: DataTypes.TEXT, allowNull: true },
      quantity: { type: DataTypes.STRING(64), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: "PrescriptionItem",
      tableName: "prescription_items",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PrescriptionItem;
};
