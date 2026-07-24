"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class LaboratoryTestCatalog extends Model {
    static associate(models) {
      LaboratoryTestCatalog.belongsTo(models.BillingService, {
        foreignKey: "billing_service_id",
        as: "billingService",
      });
      LaboratoryTestCatalog.hasMany(models.LaboratoryOrderItem, {
        foreignKey: "test_catalog_id",
        as: "orderItems",
      });
    }
  }

  LaboratoryTestCatalog.init(
    {
      test_catalog_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "HEMATOLOGY",
      },
      sample_type: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "BLOOD",
      },
      unit: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      reference_range: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      billing_service_id: {
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
      modelName: "LaboratoryTestCatalog",
      tableName: "laboratory_test_catalogs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LaboratoryTestCatalog;
};
