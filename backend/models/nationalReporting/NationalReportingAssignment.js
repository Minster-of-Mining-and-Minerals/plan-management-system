"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NationalReportingAssignment extends Model {
    static associate(models) {
      NationalReportingAssignment.belongsTo(models.NationalReportingRequirement, {
        foreignKey: "requirement_id",
        as: "requirement",
        onDelete: "CASCADE",
      });

      NationalReportingAssignment.belongsTo(models.Region, {
        foreignKey: "region_id",
        as: "region",
        onDelete: "CASCADE",
      });

      NationalReportingAssignment.hasMany(models.RegionalRequirementMapping, {
        foreignKey: "assignment_id",
        as: "mappings",
        onDelete: "CASCADE",
      });

      NationalReportingAssignment.hasMany(models.NationalPublishedRecord, {
        foreignKey: "assignment_id",
        as: "publishedRecords",
      });

      NationalReportingAssignment.belongsTo(models.User, {
        foreignKey: "assigned_by",
        as: "assignedByUser",
      });
    }
  }

  NationalReportingAssignment.init(
    {
      assignment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      requirement_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      region_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      is_mandatory: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      effective_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      effective_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      frequency_override: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "active",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lock_overrides: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      assigned_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      assigned_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "NationalReportingAssignment",
      tableName: "national_reporting_assignments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return NationalReportingAssignment;
};

