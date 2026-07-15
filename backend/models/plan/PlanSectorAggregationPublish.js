"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanSectorAggregationPublish extends Model {
    static associate(models) {
      PlanSectorAggregationPublish.belongsTo(models.PlanVersion, {
        foreignKey: "plan_version_id",
        as: "planVersion",
      });
      PlanSectorAggregationPublish.belongsTo(models.ExternalAssignment, {
        foreignKey: "external_assignment_id",
        as: "externalAssignment",
      });
      PlanSectorAggregationPublish.belongsTo(models.GovernmentStructure, {
        foreignKey: "government_structure_id",
        as: "governmentStructure",
      });
      PlanSectorAggregationPublish.belongsTo(models.User, {
        foreignKey: "published_by",
        as: "publisher",
      });
    }
  }

  PlanSectorAggregationPublish.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      plan_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      external_assignment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      government_structure_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "published", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      published_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejection_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "PlanSectorAggregationPublish",
      tableName: "plan_sector_aggregation_publishes",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PlanSectorAggregationPublish;
};
