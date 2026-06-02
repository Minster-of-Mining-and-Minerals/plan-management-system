"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PharmacyPrescriptionItem extends Model {
    static associate(models) {
      PharmacyPrescriptionItem.belongsTo(models.PharmacyPrescription, {
        foreignKey: "pharmacy_prescription_id",
        as: "pharmacyPrescription",
      });
    }
  }

  PharmacyPrescriptionItem.init(
    {
      pharmacy_prescription_item_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      pharmacy_prescription_id: { type: DataTypes.UUID, allowNull: false },
      source_prescription_item_id: { type: DataTypes.UUID, allowNull: true },
      item_name: { type: DataTypes.STRING(255), allowNull: false },
      strength: { type: DataTypes.STRING(100), allowNull: true },
      route: { type: DataTypes.STRING(100), allowNull: true },
      dosage: { type: DataTypes.STRING(100), allowNull: true },
      frequency: { type: DataTypes.STRING(100), allowNull: true },
      duration: { type: DataTypes.STRING(100), allowNull: true },
      instructions: { type: DataTypes.TEXT, allowNull: true },
      quantity: { type: DataTypes.STRING(50), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      dispensed_quantity: { type: DataTypes.STRING(50), allowNull: true },
      pharmacy_item_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending",
      },
      substitution_notes: { type: DataTypes.TEXT, allowNull: true },
      pharmacy_notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "PharmacyPrescriptionItem",
      tableName: "pharmacy_prescription_items",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PharmacyPrescriptionItem;
};
