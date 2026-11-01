"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalRequirementMapping extends Model {
    static associate(models) {
      RegionalRequirementMapping.belongsTo(models.NationalReportingAssignment, {
        foreignKey: "assignment_id",
        as: "assignment",
        onDelete: "CASCADE",
      });

      RegionalRequirementMapping.belongsTo(models.Region, {
        foreignKey: "region_id",
        as: "region",
        onDelete: "CASCADE",
      });

      RegionalRequirementMapping.belongsTo(models.RegionalPlanNode, {
        foreignKey: "regional_plan_node_id",
        as: "planNode",
      });

      RegionalRequirementMapping.belongsTo(models.RegionalPlanVersion, {
        foreignKey: "regional_plan_version_id",
        as: "planVersion",
      });

      RegionalRequirementMapping.belongsTo(models.RegionalPlanVersion, {
        foreignKey: "confirmed_period_version_id",
        as: "confirmedPeriodVersion",
      });

      RegionalRequirementMapping.belongsTo(models.User, {
        foreignKey: "confirmed_by",
        as: "confirmedByUser",
      });

      RegionalRequirementMapping.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });

      RegionalRequirementMapping.hasMany(models.NationalPublishedRecord, {
        foreignKey: "mapping_id",
        as: "publishedRecords",
      });
    }
  }

  RegionalRequirementMapping.init(
    {
      mapping_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assignment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      region_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      regional_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      regional_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      stage: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "potential", // potential, confirmed, archived
      },
      local_unit: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      unit_conversion_factor: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1.0,
      },
      contribution_ratio: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1.0,
      },
      confirmed_period_version_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      confirmed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RegionalRequirementMapping",
      tableName: "regional_requirement_mappings",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return RegionalRequirementMapping;
};

