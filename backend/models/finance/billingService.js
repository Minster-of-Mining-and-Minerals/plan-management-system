"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BillingService extends Model {
    static associate(models) {
      BillingService.belongsTo(models.BillingServiceCategory, {
        foreignKey: "category_id",
        as: "category",
      });
      BillingService.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "department",
      });
      BillingService.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      BillingService.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
      BillingService.hasMany(models.AppointmentBillingEntry, {
        foreignKey: "service_id",
        as: "billingEntries",
      });
    }
  }

  BillingService.init(
    {
      service_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      category_id: { type: DataTypes.UUID, allowNull: true },
      department_id: { type: DataTypes.UUID, allowNull: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      code: { type: DataTypes.STRING(64), allowNull: true, unique: true },
      unit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_percent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING(8),
        allowNull: false,
        defaultValue: "ETB",
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      effective_date: { type: DataTypes.DATEONLY, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "BillingService",
      tableName: "billing_services",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
      underscored: true,
    }
  );

  return BillingService;
};
