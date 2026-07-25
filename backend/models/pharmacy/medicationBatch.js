"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicationBatch extends Model {
    static associate(models) {
      MedicationBatch.belongsTo(models.Pharmacy, {
        foreignKey: "pharmacy_id",
        as: "pharmacy",
      });
      MedicationBatch.belongsTo(models.PharmacyWarehouse, {
        foreignKey: "warehouse_id",
        as: "warehouse",
      });
      MedicationBatch.belongsTo(models.MedicationCatalog, {
        foreignKey: "medication_catalog_id",
        as: "medicationCatalog",
      });
      MedicationBatch.hasMany(models.PharmacyStockTransaction, {
        foreignKey: "medication_batch_id",
        as: "transactions",
      });
    }
  }

  MedicationBatch.init(
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
      warehouse_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      medication_catalog_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      batch_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      barcode_identifier: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      manufacturer: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      manufacture_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      quantity_received: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      quantity_available: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      unit_cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      selling_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "ACTIVE", // ACTIVE, EXPIRED, QUARANTINED, DEPLETED
      },
    },
    {
      sequelize,
      modelName: "MedicationBatch",
      tableName: "medication_batches",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicationBatch;
};
