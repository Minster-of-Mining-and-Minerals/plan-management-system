"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrescriptionFulfillment extends Model {
    static associate(models) {
      PrescriptionFulfillment.belongsTo(models.PharmacyPrescription, {
        foreignKey: "pharmacy_prescription_id",
        as: "pharmacyPrescription",
      });
      PrescriptionFulfillment.belongsTo(models.User, {
        foreignKey: "fulfilled_by",
        as: "fulfiller",
      });
    }
  }

  PrescriptionFulfillment.init(
    {
      fulfillment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      pharmacy_prescription_id: { type: DataTypes.UUID, allowNull: false },
      fulfilled_by: { type: DataTypes.UUID, allowNull: true },
      fulfillment_status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "completed",
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      items_detail: { type: DataTypes.JSONB, allowNull: true },
      dispensed_at: { type: DataTypes.DATE, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "PrescriptionFulfillment",
      tableName: "prescription_fulfillments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PrescriptionFulfillment;
};
