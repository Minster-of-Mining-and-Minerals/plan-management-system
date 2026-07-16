"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TargetReallocationRequest extends Model {
    static associate(models) {
      TargetReallocationRequest.belongsTo(models.PlanVersion, {
        foreignKey: "master_plan_version_id",
        as: "masterPlanVersion",
      });
      TargetReallocationRequest.belongsTo(models.PlanVersion, {
        foreignKey: "execution_snapshot_root_id",
        as: "executionSnapshotRoot",
      });
      TargetReallocationRequest.belongsTo(models.PlanVersion, {
        foreignKey: "annual_plan_version_id",
        as: "annualPlanVersion",
      });
      TargetReallocationRequest.belongsTo(models.PlanNode, {
        foreignKey: "annual_kpi_plan_node_id",
        as: "annualKpiPlanNode",
      });
      TargetReallocationRequest.belongsTo(models.PlanVersion, {
        foreignKey: "from_period_version_id",
        as: "fromPeriodVersion",
      });
      TargetReallocationRequest.belongsTo(models.PlanVersion, {
        foreignKey: "to_period_version_id",
        as: "toPeriodVersion",
      });
      TargetReallocationRequest.belongsTo(models.PlanNode, {
        foreignKey: "from_period_plan_node_id",
        as: "fromPeriodPlanNode",
      });
      TargetReallocationRequest.belongsTo(models.PlanNode, {
        foreignKey: "to_period_plan_node_id",
        as: "toPeriodPlanNode",
      });
      TargetReallocationRequest.belongsTo(models.User, {
        foreignKey: "requested_by",
        as: "requester",
      });
      TargetReallocationRequest.belongsTo(models.User, {
        foreignKey: "reviewed_by",
        as: "reviewer",
      });
      TargetReallocationRequest.belongsTo(models.PlanAmendment, {
        foreignKey: "plan_amendment_id",
        as: "planAmendment",
      });
      TargetReallocationRequest.hasMany(models.TargetAllocationHistory, {
        foreignKey: "reference_id",
        as: "allocationHistories",
      });
    }
  }

  TargetReallocationRequest.init(
    {
      target_reallocation_request_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      plan_amendment_id: {
        type: DataTypes.UUID,
        allowNull: true,
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
      from_period_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      to_period_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      from_period_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      to_period_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected", "cancelled", "applied"),
        allowNull: false,
        defaultValue: "pending",
      },
      requested_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      requested_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      review_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      applied_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "TargetReallocationRequest",
      tableName: "target_reallocation_requests",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return TargetReallocationRequest;
};
