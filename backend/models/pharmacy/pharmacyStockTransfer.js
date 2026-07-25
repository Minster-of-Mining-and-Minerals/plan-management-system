"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PharmacyStockTransfer extends Model {
    static associate(models) {
      PharmacyStockTransfer.belongsTo(models.Pharmacy, {
        foreignKey: "source_pharmacy_id",
        as: "sourcePharmacy",
      });
      PharmacyStockTransfer.belongsTo(models.Pharmacy, {
        foreignKey: "destination_pharmacy_id",
        as: "destinationPharmacy",
      });
      PharmacyStockTransfer.belongsTo(models.MedicationBatch, {
        foreignKey: "medication_batch_id",
        as: "batch",
      });
      PharmacyStockTransfer.belongsTo(models.User, {
        foreignKey: "requested_by",
        as: "requester",
      });
      PharmacyStockTransfer.belongsTo(models.User, {
        foreignKey: "received_by",
        as: "receiver",
      });
    }
  }

  PharmacyStockTransfer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      source_pharmacy_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      destination_pharmacy_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      medication_batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "REQUESTED", // REQUESTED, TRANSIT, RECEIVED, REJECTED
      },
      requested_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      received_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      received_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "PharmacyStockTransfer",
      tableName: "pharmacy_stock_transfers",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PharmacyStockTransfer;
};
