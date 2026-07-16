"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanAmendment extends Model {
    static associate(models) {
      PlanAmendment.belongsTo(models.PlanVersion, {
        foreignKey: "master_plan_version_id",
        as: "masterPlanVersion",
      });
      PlanAmendment.belongsTo(models.User, {
        foreignKey: "requested_by",
        as: "requester",
      });
      PlanAmendment.belongsTo(models.User, {
        foreignKey: "reviewed_by",
        as: "reviewer",
      });
      PlanAmendment.hasMany(models.PlanAmendmentHistory, {
        foreignKey: "plan_amendment_id",
        as: "histories",
      });
      PlanAmendment.hasMany(models.PlanAmendmentAction, {
        foreignKey: "plan_amendment_id",
        as: "actions",
      });
      PlanAmendment.hasOne(models.TargetReallocationRequest, {
        foreignKey: "plan_amendment_id",
        as: "targetReallocationRequest",
      });
      PlanAmendment.belongsTo(models.PlanAmendment, {
        foreignKey: "compensates_amendment_id",
        as: "compensatesAmendment",
      });
      PlanAmendment.hasMany(models.PlanAmendment, {
        foreignKey: "compensates_amendment_id",
        as: "compensatingAmendments",
      });
    }
  }

  PlanAmendment.init(
    {
      plan_amendment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      master_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      amendment_type: {
        type: DataTypes.ENUM(
          "target_reallocation",
          "annual_target_revision",
          "budget_increase",
          "budget_reduction",
          "kpi_addition",
          "kpi_removal",
          "owner_transfer",
          "timeline_extension",
          "plan_correction",
          "custom"
        ),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "draft",
          "pending_approval",
          "approved",
          "rejected",
          "cancelled",
          "applied"
        ),
        allowNull: false,
        defaultValue: "draft",
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
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      effective_mode: {
        type: DataTypes.ENUM("immediate", "next_period", "custom_date"),
        allowNull: false,
        defaultValue: "immediate",
      },
      effective_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      expected_version: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_package: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      compensates_amendment_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: "PlanAmendment",
      tableName: "plan_amendments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PlanAmendment;
};
