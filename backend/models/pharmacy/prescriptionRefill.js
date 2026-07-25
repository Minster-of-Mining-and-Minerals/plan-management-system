"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrescriptionRefill extends Model {
    static associate(models) {
      PrescriptionRefill.belongsTo(models.Prescription, {
        foreignKey: "prescription_id",
        as: "prescription",
      });
      PrescriptionRefill.belongsTo(models.User, {
        foreignKey: "dispensed_by",
        as: "dispenser",
      });
    }
  }

  PrescriptionRefill.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      prescription_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      refill_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      max_refills: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      dispensed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      dispensed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "DISPENSED", // AUTHORIZED, DISPENSED, CANCELLED
      },
    },
    {
      sequelize,
      modelName: "PrescriptionRefill",
      tableName: "prescription_refills",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PrescriptionRefill;
};
