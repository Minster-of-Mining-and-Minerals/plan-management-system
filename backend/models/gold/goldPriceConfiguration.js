"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GoldPriceConfiguration extends Model {
    static associate(models) {
      GoldPriceConfiguration.belongsTo(models.GoldMeasurementUnit, {
        foreignKey: "measurement_unit_id",
        as: "measurementUnit",
      });

      GoldPriceConfiguration.belongsTo(models.User, {
        foreignKey: "created_by_id",
        as: "createdBy",
      });

      GoldPriceConfiguration.belongsTo(models.User, {
        foreignKey: "updated_by_id",
        as: "updatedBy",
      });

      GoldPriceConfiguration.hasMany(models.GoldPurchase, {
        foreignKey: "price_configuration_id",
        as: "purchases",
      });
    }
  }

  GoldPriceConfiguration.init(
    {
      price_config_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      gold_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "all",
      },
      karat: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      purity_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      quality_grade: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      measurement_unit_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      price_per_unit: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      min_price_per_unit: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },
      max_price_per_unit: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "ETB",
      },
      effective_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      updated_by_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "GoldPriceConfiguration",
      tableName: "gold_price_configurations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      indexes: [
        { fields: ["karat", "is_active"] },
        { fields: ["gold_type"] },
        { fields: ["quality_grade"] },
        { fields: ["is_active"] },
      ],
    }
  );

  return GoldPriceConfiguration;
};
