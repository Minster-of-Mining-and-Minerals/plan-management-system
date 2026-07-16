"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanPeriodTargetBaseline extends Model {
    static associate(models) {
      PlanPeriodTargetBaseline.belongsTo(models.PlanVersion, {
        foreignKey: "master_plan_version_id",
        as: "masterPlanVersion",
      });
      PlanPeriodTargetBaseline.belongsTo(models.PlanVersion, {
        foreignKey: "execution_snapshot_root_id",
        as: "executionSnapshotRoot",
      });
      PlanPeriodTargetBaseline.belongsTo(models.PlanVersion, {
        foreignKey: "annual_plan_version_id",
        as: "annualPlanVersion",
      });
      PlanPeriodTargetBaseline.belongsTo(models.PlanNode, {
        foreignKey: "annual_kpi_plan_node_id",
        as: "annualKpiPlanNode",
      });
      PlanPeriodTargetBaseline.belongsTo(models.PlanVersion, {
        foreignKey: "period_version_id",
        as: "periodVersion",
      });
      PlanPeriodTargetBaseline.belongsTo(models.PlanNode, {
        foreignKey: "snapshot_period_plan_node_id",
        as: "snapshotPeriodPlanNode",
      });
    }
  }

  PlanPeriodTargetBaseline.init(
    {
      plan_period_target_baseline_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      master_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      execution_snapshot_root_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      annual_plan_version_id: {
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
      snapshot_period_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      original_target: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "PlanPeriodTargetBaseline",
      tableName: "plan_period_target_baselines",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PlanPeriodTargetBaseline;
};
