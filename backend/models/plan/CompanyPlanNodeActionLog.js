"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyPlanNodeActionLog extends Model {
    static associate(models) {
      CompanyPlanNodeActionLog.belongsTo(models.CompanyPlanNode, {
        foreignKey: "company_plan_node_id",
        as: "planNode",
        onDelete: "CASCADE",
      });

      CompanyPlanNodeActionLog.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  CompanyPlanNodeActionLog.init(
    {
      action_log_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      previous_values: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      new_values: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CompanyPlanNodeActionLog",
      tableName: "company_plan_node_action_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return CompanyPlanNodeActionLog;
};
