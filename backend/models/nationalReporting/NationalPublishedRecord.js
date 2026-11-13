"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NationalPublishedRecord extends Model {
    static associate(models) {
      NationalPublishedRecord.belongsTo(models.NationalReportingRequirement, {
        foreignKey: "requirement_id",
        as: "requirement",
        onDelete: "CASCADE",
      });

      NationalPublishedRecord.belongsTo(models.NationalReportingAssignment, {
        foreignKey: "assignment_id",
        as: "assignment",
        onDelete: "CASCADE",
      });

      NationalPublishedRecord.belongsTo(models.RegionalRequirementMapping, {
        foreignKey: "mapping_id",
        as: "mapping",
        onDelete: "CASCADE",
      });

      NationalPublishedRecord.belongsTo(models.Region, {
        foreignKey: "region_id",
        as: "region",
        onDelete: "CASCADE",
      });

      NationalPublishedRecord.belongsTo(models.RegionalPlanNode, {
        foreignKey: "regional_plan_node_id",
        as: "planNode",
      });

      NationalPublishedRecord.belongsTo(models.RegionalPlanVersion, {
        foreignKey: "regional_plan_version_id",
        as: "planVersion",
      });

      NationalPublishedRecord.belongsTo(models.User, {
        foreignKey: "published_by",
        as: "publishedByUser",
      });

      NationalPublishedRecord.belongsTo(models.User, {
        foreignKey: "regional_validated_by",
        as: "validatedByUser",
      });
    }
  }

  NationalPublishedRecord.init(
    {
      published_record_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      publication_reference: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      requirement_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      assignment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      mapping_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      region_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      regional_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      regional_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      submission_method: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "node_mapping", // node_mapping, form_based
      },
      reporting_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reporting_period_label: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      reporting_period_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      planned_target: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      reported_actual: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      local_unit: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      standardized_target: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      standardized_actual: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      standardized_unit: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      achievement_percent: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      annual_target: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      annual_achievement_percent: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      narrative: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      evidence_attachments: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      regional_validated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      regional_validated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      published_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      published_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      revision_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      superseded_by_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "published", // published, superseded, clarification_requested
      },
      clarification_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      snapshot_data: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "NationalPublishedRecord",
      tableName: "national_published_records",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return NationalPublishedRecord;
};

