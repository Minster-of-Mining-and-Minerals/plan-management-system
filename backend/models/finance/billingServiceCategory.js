"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BillingServiceCategory extends Model {
    static associate(models) {
      BillingServiceCategory.hasMany(models.BillingService, {
        foreignKey: "category_id",
        as: "services",
      });
      BillingServiceCategory.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      BillingServiceCategory.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
    }
  }

  BillingServiceCategory.init(
    {
      category_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(150), allowNull: false },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "BillingServiceCategory",
      tableName: "billing_service_categories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
      underscored: true,
    }
  );

  return BillingServiceCategory;
};
