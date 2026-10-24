"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GoldMeasurementUnit extends Model {
    static associate(models) {
      GoldMeasurementUnit.hasMany(models.GoldPurchase, {
        foreignKey: "measurement_unit_id",
        as: "purchases",
      });
    }
  }

  GoldMeasurementUnit.init(
    {
      unit_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      symbol: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      conversion_factor: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 1.0,
      },
      is_canonical_base: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "GoldMeasurementUnit",
      tableName: "gold_measurement_units",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      indexes: [
        { unique: true, fields: ["code"] },
        { unique: true, fields: ["name"] },
        { fields: ["is_active"] },
      ],
    }
  );

  return GoldMeasurementUnit;
};
