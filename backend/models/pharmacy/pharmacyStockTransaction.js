"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PharmacyStockTransaction extends Model {
    static associate(models) {
      PharmacyStockTransaction.belongsTo(models.Pharmacy, {
        foreignKey: "pharmacy_id",
        as: "pharmacy",
      });
      PharmacyStockTransaction.belongsTo(models.PharmacyWarehouse, {
        foreignKey: "warehouse_id",
        as: "warehouse",
      });
      PharmacyStockTransaction.belongsTo(models.MedicationBatch, {
        foreignKey: "medication_batch_id",
        as: "batch",
      });
      PharmacyStockTransaction.belongsTo(models.User, {
        foreignKey: "performed_by",
        as: "performer",
      });
    }
  }

  PharmacyStockTransaction.init(
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
      medication_batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      transaction_type: {
        type: DataTypes.STRING(50),
        allowNull: false, // PURCHASE_RECEIVED, DISPENSED, RETURNED, ADJUSTMENT, EXPIRED, TRANSFER
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reference_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      reference_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      performed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "PharmacyStockTransaction",
      tableName: "pharmacy_stock_transactions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PharmacyStockTransaction;
};
