"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanAmendmentAction extends Model {
    static associate(models) {
      PlanAmendmentAction.belongsTo(models.PlanAmendment, {
        foreignKey: "plan_amendment_id",
        as: "amendment",
      });
      PlanAmendmentAction.hasMany(models.PlanAmendmentHistory, {
        foreignKey: "plan_amendment_action_id",
        as: "histories",
      });
    }
  }

  PlanAmendmentAction.init(
    {
      plan_amendment_action_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      plan_amendment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      action_type: {
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
      sequence: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      status: {
        type: DataTypes.ENUM("pending", "applied", "failed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      preview: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      impact: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      depends_on_sequence: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      error_message: {
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
      modelName: "PlanAmendmentAction",
      tableName: "plan_amendment_actions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PlanAmendmentAction;
};
