"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TargetAllocationHistory extends Model {
    static associate(models) {
      TargetAllocationHistory.belongsTo(models.PlanVersion, {
        foreignKey: "master_plan_version_id",
        as: "masterPlanVersion",
      });
      TargetAllocationHistory.belongsTo(models.PlanNode, {
        foreignKey: "annual_kpi_plan_node_id",
        as: "annualKpiPlanNode",
      });
      TargetAllocationHistory.belongsTo(models.PlanVersion, {
        foreignKey: "period_version_id",
        as: "periodVersion",
      });
      TargetAllocationHistory.belongsTo(models.PlanNode, {
        foreignKey: "period_plan_node_id",
        as: "periodPlanNode",
      });
      TargetAllocationHistory.belongsTo(models.TargetReallocationRequest, {
        foreignKey: "reference_id",
        as: "reallocationRequest",
      });
      TargetAllocationHistory.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changedByUser",
      });
    }
  }

  TargetAllocationHistory.init(
    {
      target_allocation_history_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      master_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      annual_kpi_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      period_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      period_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      old_target: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      new_target: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      change_type: {
        type: DataTypes.ENUM("reallocation"),
        allowNull: false,
        defaultValue: "reallocation",
      },
      reference_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      changed_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "TargetAllocationHistory",
      tableName: "target_allocation_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return TargetAllocationHistory;
};
