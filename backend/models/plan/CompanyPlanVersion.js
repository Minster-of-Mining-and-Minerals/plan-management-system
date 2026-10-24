"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyPlanVersion extends Model {
    static associate(models) {
      CompanyPlanVersion.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
        onDelete: "CASCADE",
      });

      CompanyPlanVersion.belongsTo(models.CompanyPlanVersion, {
        foreignKey: "based_on_version_id",
        as: "baseVersion",
      });

      CompanyPlanVersion.belongsTo(models.CompanyPlanVersion, {
        foreignKey: "parent_plan_version_id",
        as: "parentPlanVersion",
      });

      CompanyPlanVersion.hasMany(models.CompanyPlanVersion, {
        foreignKey: "parent_plan_version_id",
        as: "annualVersions",
      });

      CompanyPlanVersion.hasMany(models.CompanyPlanVersion, {
        foreignKey: "parent_plan_version_id",
        as: "executionPeriodVersions",
      });

      CompanyPlanVersion.belongsTo(models.CompanyPlanRule, {
        foreignKey: "company_plan_rule_id",
        as: "planRule",
      });

      CompanyPlanVersion.belongsTo(models.CompanyPlanningConfiguration, {
        foreignKey: "company_planning_config_id",
        as: "planningConfiguration",
      });

      CompanyPlanVersion.hasMany(models.CompanyPlanNode, {
        foreignKey: "company_plan_version_id",
        as: "planNodes",
        onDelete: "CASCADE",
      });
    }
  }

  CompanyPlanVersion.init(
    {
      company_plan_version_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      parent_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      based_on_version_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      company_plan_rule_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      company_planning_config_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      draft_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      version_kind: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "master",
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "draft",
      },
      version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      planning_year: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sequence_index: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      period_label: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      period_subdivision_mode: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      start_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      end_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      start_month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      end_month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 12,
      },
      planning_duration_years: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      planning_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      planning_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_locked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      finalized_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      annual_targets_finalized_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      period_targets_finalized_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      process_started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      execution_status: {
        type: DataTypes.STRING(50),
        defaultValue: "open",
      },
      review_status: {
        type: DataTypes.STRING(50),
        defaultValue: "draft",
      },
    },
    {
      sequelize,
      modelName: "CompanyPlanVersion",
      tableName: "company_plan_versions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return CompanyPlanVersion;
};
