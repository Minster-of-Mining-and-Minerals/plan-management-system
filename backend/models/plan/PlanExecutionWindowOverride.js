"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanExecutionWindowOverride extends Model {
    static associate(models) {
      PlanExecutionWindowOverride.belongsTo(models.PlanAmendment, {
        foreignKey: "plan_amendment_id",
        as: "amendment",
      });
      PlanExecutionWindowOverride.belongsTo(models.PlanAmendmentAction, {
        foreignKey: "plan_amendment_action_id",
        as: "amendmentAction",
      });
      PlanExecutionWindowOverride.belongsTo(models.PlanVersion, {
        foreignKey: "master_plan_version_id",
        as: "masterPlanVersion",
      });
      PlanExecutionWindowOverride.belongsTo(models.PlanVersion, {
        foreignKey: "live_period_version_id",
        as: "livePeriodVersion",
      });
      PlanExecutionWindowOverride.belongsTo(models.PlanVersion, {
        foreignKey: "snapshot_period_version_id",
        as: "snapshotPeriodVersion",
      });
      PlanExecutionWindowOverride.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  PlanExecutionWindowOverride.init(
    {
      plan_execution_window_override_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      plan_amendment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      plan_amendment_action_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      master_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      live_period_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      snapshot_period_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      previous_execution_status: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      reopen_start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      reopen_end: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      kpi_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      goal_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      government_structure_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      expired_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "PlanExecutionWindowOverride",
      tableName: "plan_execution_window_overrides",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PlanExecutionWindowOverride;
};
