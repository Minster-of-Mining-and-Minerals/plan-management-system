"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NationalReportingRequirement extends Model {
    static associate(models) {
      NationalReportingRequirement.hasMany(models.NationalReportingAssignment, {
        foreignKey: "requirement_id",
        as: "assignments",
        onDelete: "CASCADE",
      });

      NationalReportingRequirement.hasMany(models.NationalPublishedRecord, {
        foreignKey: "requirement_id",
        as: "publishedRecords",
      });

      NationalReportingRequirement.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });

      NationalReportingRequirement.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
    }
  }

  NationalReportingRequirement.init(
    {
      requirement_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "mining_production",
      },
      expected_unit: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      unit_category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "mass",
      },
      frequency: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "quarterly",
      },
      requires_numeric: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      requires_narrative: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      requires_evidence: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      validation_rules: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      effective_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      effective_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
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
      modelName: "NationalReportingRequirement",
      tableName: "national_reporting_requirements",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return NationalReportingRequirement;
};

