"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class ClinicalOrderResultHistory extends Model {
    static associate(models) {
      ClinicalOrderResultHistory.belongsTo(models.ClinicalOrderResult, {
        foreignKey: "result_id",
        as: "result",
      });
      ClinicalOrderResultHistory.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changedByUser",
      });
    }
  }

  ClinicalOrderResultHistory.init(
    {
      history_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      result_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      previous_summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      previous_data: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      new_summary: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      new_data: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ClinicalOrderResultHistory",
      tableName: "clinical_order_result_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ClinicalOrderResultHistory;
};
