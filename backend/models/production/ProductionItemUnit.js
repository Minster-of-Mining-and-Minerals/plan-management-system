"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProductionItemUnit extends Model {
    static associate(models) {
      ProductionItemUnit.belongsTo(models.ProductionItem, {
        foreignKey: "production_item_id",
        as: "productionItem",
      });

      ProductionItemUnit.belongsTo(models.GoldMeasurementUnit, {
        foreignKey: "unit_id",
        as: "measurementUnit",
      });
    }
  }

  ProductionItemUnit.init(
    {
      item_unit_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      production_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      unit_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      conversion_factor_to_base: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 1.0,
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "ProductionItemUnit",
      tableName: "production_item_units",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ProductionItemUnit;
};
