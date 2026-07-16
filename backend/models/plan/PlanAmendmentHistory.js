"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanAmendmentHistory extends Model {
    static associate(models) {
      PlanAmendmentHistory.belongsTo(models.PlanAmendment, {
        foreignKey: "plan_amendment_id",
        as: "amendment",
      });
      PlanAmendmentHistory.belongsTo(models.PlanAmendmentAction, {
        foreignKey: "plan_amendment_action_id",
        as: "action",
      });
      PlanAmendmentHistory.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changedByUser",
      });
    }
  }

  PlanAmendmentHistory.init(
    {
      plan_amendment_history_id: {
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
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      field_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      old_value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      new_value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      changed_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "PlanAmendmentHistory",
      tableName: "plan_amendment_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PlanAmendmentHistory;
};
