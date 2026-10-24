"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyProductionTarget extends Model {
    static associate(models) {
      CompanyProductionTarget.belongsTo(models.CompanyProductionAssignment, {
        foreignKey: "assignment_id",
        as: "assignment",
      });

      CompanyProductionTarget.belongsTo(models.CompanyProductionTarget, {
        foreignKey: "parent_target_id",
        as: "parentTarget",
      });

      CompanyProductionTarget.hasMany(models.CompanyProductionTarget, {
        foreignKey: "parent_target_id",
        as: "childTargets",
      });

      CompanyProductionTarget.belongsTo(models.GoldMeasurementUnit, {
        foreignKey: "unit_id",
        as: "unit",
      });

      CompanyProductionTarget.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  CompanyProductionTarget.init(
    {
      target_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assignment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      parent_target_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      target_period_type: {
        type: DataTypes.STRING(50),
        allowNull: false, // 'year', 'half_year', 'quarter', 'month', 'day'
      },
      period_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      period_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      period_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      target_quantity: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
      },
      unit_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      target_quantity_base: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "published", // 'draft', 'published', 'superseded'
      },
      revision_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CompanyProductionTarget",
      tableName: "company_production_targets",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return CompanyProductionTarget;
};
