"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProductionItem extends Model {
    static associate(models) {
      ProductionItem.belongsTo(models.GoldMeasurementUnit, {
        foreignKey: "base_unit_id",
        as: "baseUnit",
      });

      ProductionItem.belongsTo(models.GoldMeasurementUnit, {
        foreignKey: "default_reporting_unit_id",
        as: "defaultReportingUnit",
      });

      ProductionItem.hasMany(models.ProductionItemUnit, {
        foreignKey: "production_item_id",
        as: "supportedUnits",
        onDelete: "CASCADE",
      });

      ProductionItem.hasMany(models.CompanyProductionAssignment, {
        foreignKey: "production_item_id",
        as: "companyAssignments",
      });

      ProductionItem.hasMany(models.CompanyProductionReport, {
        foreignKey: "production_item_id",
        as: "productionReports",
      });
    }
  }

  ProductionItem.init(
    {
      production_item_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      base_unit_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      default_reporting_unit_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "ProductionItem",
      tableName: "production_items",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return ProductionItem;
};
