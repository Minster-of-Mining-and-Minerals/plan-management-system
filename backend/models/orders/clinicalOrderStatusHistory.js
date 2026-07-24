"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class ClinicalOrderStatusHistory extends Model {
    static associate(models) {
      ClinicalOrderStatusHistory.belongsTo(models.ClinicalOrder, {
        foreignKey: "order_id",
        as: "order",
      });
      ClinicalOrderStatusHistory.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changedByUser",
      });
    }
  }

  ClinicalOrderStatusHistory.init(
    {
      history_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      previous_status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      new_status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ClinicalOrderStatusHistory",
      tableName: "clinical_order_status_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ClinicalOrderStatusHistory;
};
