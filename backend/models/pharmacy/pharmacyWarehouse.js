"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PharmacyWarehouse extends Model {
    static associate(models) {
      PharmacyWarehouse.belongsTo(models.Pharmacy, {
        foreignKey: "pharmacy_id",
        as: "pharmacy",
      });
      PharmacyWarehouse.hasMany(models.MedicationBatch, {
        foreignKey: "warehouse_id",
        as: "batches",
      });
    }
  }

  PharmacyWarehouse.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      pharmacy_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      warehouse_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
    },
    {
      sequelize,
      modelName: "PharmacyWarehouse",
      tableName: "pharmacy_warehouses",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PharmacyWarehouse;
};
