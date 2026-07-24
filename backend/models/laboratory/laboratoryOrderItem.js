"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class LaboratoryOrderItem extends Model {
    static associate(models) {
      LaboratoryOrderItem.belongsTo(models.ClinicalOrder, {
        foreignKey: "order_id",
        as: "order",
      });
      LaboratoryOrderItem.belongsTo(models.LaboratoryTestCatalog, {
        foreignKey: "test_catalog_id",
        as: "catalogTest",
      });
    }
  }

  LaboratoryOrderItem.init(
    {
      item_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      test_catalog_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      test_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "PENDING",
      },
    },
    {
      sequelize,
      modelName: "LaboratoryOrderItem",
      tableName: "laboratory_order_items",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LaboratoryOrderItem;
};
